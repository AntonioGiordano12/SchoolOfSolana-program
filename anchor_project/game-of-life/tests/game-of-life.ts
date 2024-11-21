import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GameOfLife } from "../target/types/game_of_life";
import { assert } from "chai";

const USER_SEED = "USER_SEED";
const GAME_SEED = "GAME_SEED";
const GAME_SAVE_SEED = "GAME_SAVE_SEED";
const FEED_SEED = "FEED_SEED";

const MAX_SAVED_GAMES = 10;

describe("Game of Life", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GameOfLife as Program<GameOfLife>;
  const user1 = anchor.web3.Keypair.generate(); // User 1 (primary)
  const user2 = anchor.web3.Keypair.generate(); // User 2 (secondary)

  let userProfile1: anchor.web3.PublicKey;
  let userProfile2: anchor.web3.PublicKey;
  let gameConfig1: anchor.web3.PublicKey;
  let gameConfig2: anchor.web3.PublicKey;

  const bitmap = serializeBitmap([
    [1, 1],
    [1, 2],
    [1, 3],
  ]);

  const fullBitmap = new Uint8Array((64 * 64) / 8); // Bitmap for 64x64 grid
  fullBitmap.fill(0xff);

  before(async () => {
    // Airdrop for both users
    await airdrop(provider.connection, user1.publicKey);
    await airdrop(provider.connection, user2.publicKey);

    // Derive PDAs for user profiles
    [userProfile1] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(USER_SEED), user1.publicKey.toBuffer()],
      program.programId
    );
    [userProfile2] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(USER_SEED), user2.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Game Initialization", () => {
    it("Initializes a new game (happy path)", async () => {
      [gameConfig1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(GAME_SEED), user1.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initialize(Buffer.from(bitmap))
        .accounts({
          gameConfig: gameConfig1,
          gameOwner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const game = await program.account.gameConfig.fetch(gameConfig1);
      assert.ok(
        new Uint8Array(game.aliveCells).every((value, index) => value === bitmap[index]),
        "Bitmap should match initialized values"
      );
    });

    it("Fails to reinitialize an existing game", async () => {
      try {
        await program.methods
          .initialize(Buffer.from(bitmap))
          .accounts({
            gameConfig: gameConfig1,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error when reinitializing an existing game");
      } catch (err) {
        assert.ok(
          err.logs.join("").includes("already in use"),
          "Error should indicate PDA collision"
        );
      }
    });


    it("Initializes a game with a fully filled grid (valid size)", async () => {

      const [gameConfig] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(GAME_SEED), user1.publicKey.toBuffer()],
        program.programId
      );
    
      await program.methods
        .initialize(Buffer.from(fullBitmap))
        .accounts({
          gameConfig,
          gameOwner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc({skipPreflight: true});
    
      const game = await program.account.gameConfig.fetch(gameConfig);
      assert.ok(
        new Uint8Array(game.aliveCells).every((value, index) => value === fullBitmap[index]),
        "Bitmap should match fully filled grid"
      );
    });


    it("Fails to initialize a game with an oversized grid", async () => {
      const oversizedBitmap = new Uint8Array(4097); // One byte too large for 64x64 grid
      oversizedBitmap.fill(0xff);
    
      const [gameConfig] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(GAME_SEED), user1.publicKey.toBuffer()],
        program.programId
      );
    
      try {
        await program.methods
          .initialize(Buffer.from(oversizedBitmap))
          .accounts({
            gameConfig,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error when initializing with oversized grid");
      } catch (err) {
        assert.ok(
          err.logs.join("").includes("TooManyAliveCells"),
          "Error should indicate grid is too large"
        );
      }
    });


    it("Fails to initialize a game with an undersized grid", async () => {
      const undersizedBitmap = new Uint8Array(511); // One byte too small for 64x64 grid
    
      const [gameConfig] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(GAME_SEED), user1.publicKey.toBuffer()],
        program.programId
      );
    
      try {
        await program.methods
          .initialize(Buffer.from(undersizedBitmap))
          .accounts({
            gameConfig,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error when initializing with undersized grid");
      } catch (err) {
        assert.ok(
          err.logs.join("").includes("InvalidBitmapSize"),
          "Error should indicate grid is too small"
        );
      }
    });
    
    


    
  });

  describe("User Profile Management", () => {
    it("Initializes a user profile (happy path)", async () => {
      await program.methods
        .initializeUserProfile()
        .accounts({
          userProfile: userProfile1,
          user: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const profile = await program.account.userProfile.fetch(userProfile1);
      assert.equal(profile.user.toBase58(), user1.publicKey.toBase58(), "User should match the wallet");
      assert.equal(profile.savedGameCounter, 0, "Saved games should initially be empty");
    });

    it("Fails to reinitialize an existing user profile", async () => {
      try {
        await program.methods
          .initializeUserProfile()
          .accounts({
            userProfile: userProfile1,
            user: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error when reinitializing an existing profile");
      } catch (err) {
        assert.ok(
          err.logs.join("").includes("already in use"),
          "Error should indicate PDA collision"
        );
      }
    });
  });

  describe("Game Save Management", () => {
    it("Adds a game to the profile (happy path)", async () => {
      const [gameSave] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(GAME_SAVE_SEED), user1.publicKey.toBuffer()],
        program.programId
      );

      const [userProfile1] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(USER_SEED), user1.publicKey.toBuffer()], // Match the updated program
        program.programId
      );

      await program.methods
        .addGameToProfile()
        .accounts({
          userProfile: userProfile1,
          gameSave,
          gameConfig: gameConfig1,
          user: user1.publicKey,
          gameConfigOwner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();


      const profile = await program.account.userProfile.fetch(userProfile1);
      assert.equal(profile.savedGameCounter, 1, "Total games saved should increment");

      const save = await program.account.gameSave.fetch(gameSave);
      assert.equal(save.user.toBase58(), user1.publicKey.toBase58(), "Save should reference the correct user");
      assert.equal(save.game.toBase58(), gameConfig1.toBase58(), "Save should reference the correct game");
    });

    it("Fails to add a duplicate game to the profile", async () => {
      const [gameSave] = anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from(GAME_SAVE_SEED), user1.publicKey.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .addGameToProfile()
          .accounts({
            userProfile1,
            gameSave,
            gameConfig1,
            user: user1.publicKey,
            gameConfigOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error for duplicate game");
      } catch (err) {
        assert.ok(
          err.logs.join("").includes("already in use"),
          `Error should indicate PDA collision: ${err.logs}`
        );
      }
    });
  });
});

// --- Helper Functions ---
async function airdrop(connection: any, address: any, amount = 1_000_000_000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}

  /**
   * Converts an array of cell positions into a bit-packed `Uint8Array`
   * (where each bit represents whether a cell is alive or not).
   * @param aliveCells Array of [row, col] positions of alive cells.
   * @returns A `Uint8Array` of size `Math.ceil(gridSize * gridSize / 8)`.
   * @throws If any of the cell positions are out of bounds.
   */
function serializeBitmap(aliveCells: Array<[number, number]>): Uint8Array {
  const gridSize = 64;
  const bitmap = new Uint8Array((gridSize * gridSize) / 8);
  for (const [row, col] of aliveCells) {
    if (row >= gridSize || col >= gridSize) {
      throw new Error(`Invalid cell position: (${row}, ${col}) exceeds grid size.`);
    }
    const bitIndex = row * gridSize + col;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitOffset = bitIndex % 8;
    bitmap[byteIndex] |= 1 << bitOffset;
  }
  return bitmap;
}



function deserializeBitmap(bitmap: Uint8Array): Array<[number, number]> {
  const gridSize = 64;
  const aliveCells: Array<[number, number]> = [];
  for (let byteIndex = 0; byteIndex < bitmap.length; byteIndex++) {
    const byte = bitmap[byteIndex];
    for (let bitOffset = 0; bitOffset < 8; bitOffset++) {
      if ((byte & (1 << bitOffset)) !== 0) {
        const bitIndex = byteIndex * 8 + bitOffset;
        const row = Math.floor(bitIndex / gridSize);
        const col = bitIndex % gridSize;
        aliveCells.push([row, col]);
      }
    }
  }
  return aliveCells;
}
