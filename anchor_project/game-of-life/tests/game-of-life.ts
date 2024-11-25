import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GameOfLife } from "../target/types/game_of_life";
import { assert } from "chai";

const USER_SEED = "USER_SEED";
const GAME_SEED = "GAME_SEED";
const STAR_SEED = "STAR_SEED";
const FEED_SEED = "FEED_SEED";

const MAX_ALIVE_CELLS = 512; // Limit for alive cells to prevent unbounded storage (64x64/8)

export const GAME_ERRORS = {
  GameAlreadySaved: "This game has already been saved.",
  GameNotSaved: "The specified game is not saved.",
  InvalidGrid: "Invalid grid size. The grid exceeds maximum allowed size.",
  MinGamesReached: "Min games reached - no games was saved",
  MaxStarsReached: "Maximum number of stars reached",
  MinStarsReached: "Minimum number of stars reached",
  GameIdAlreadyExists: "Game ID already in use",
  FeedFull: "Feed is full",
  IDTooLong: "ID too long",
  InvalidAuthority: "Invalid Authority for the Feed",
};


describe("Game of Life", () => {
  const program = anchor.workspace.GameOfLife as Program<GameOfLife>;
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const user1 = anchor.web3.Keypair.generate(); // User 1 (primary)
  const user2 = anchor.web3.Keypair.generate(); // User 2 (secondary)

  const gameId1 = "game1";
  const gameId2 = "game name is way too loooooooooooooooooooooooooooooooooooooooooong";
  const gameId3 = "game3 - filled grid";
  const gameId4 = "game4 - oversized grid";
  const gameId5 = "game5 - undersized grid";

  const bitmap = serializeBitmap([
    [1, 1],
    [1, 2],
    [1, 3],
  ]);

  const fullBitmap = new Uint8Array((64 * 64) / 8); // Bitmap for 64x64 grid
  fullBitmap.fill(0xff);

  const [feedPda, feedBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from(FEED_SEED)], program.programId);
  const [feedAuthority, feedAuthorityBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("feed_authority")], program.programId);

  before(async () => {
    // Airdrop for both users
    await airdrop(provider.connection, user1.publicKey);
    await airdrop(provider.connection, user2.publicKey);

  });

  // describe("User Profile Management", () => {
  //   it("Initialize users profile for user1", async () => {
  //     const [userProfile, userProfileBump] = getUserProfileAddress(user1.publicKey, program.programId);

  //     await program.methods
  //       .initializeUserProfile()
  //       .accounts({
  //         userProfile: userProfile,
  //         user: user1.publicKey,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       })
  //       .signers([user1])
  //       .rpc();

  //     await checkUserProfile(program, userProfile, user1.publicKey, 0, userProfileBump); // Validate initialized user1 profile
  //   });

  //   it("Fails to reinitialize an existing user profile (user1)", async () => {
  //     const [userProfile, userProfileBump] = getUserProfileAddress(user1.publicKey, program.programId);

  //     try {
  //       await program.methods
  //         .initializeUserProfile()
  //         .accounts({
  //           userProfile: userProfile,
  //           user: user1.publicKey,
  //           systemProgram: anchor.web3.SystemProgram.programId,
  //         })
  //         .signers([user1])
  //         .rpc();
  //       assert.fail("Expected an error when reinitializing an existing profile");
  //     } catch (err) {
  //       assert.ok(
  //         err.logs.join("").includes("already in use"),
  //         "Error should indicate PDA collision"
  //       );
  //     }
  //   });
  // });
  describe("Feed Initialization", async () => {
    it("Cannot Initializes the feed with wrong authority", async () => {
      try {
        // Attempt to initialize the feed with an incorrect authority
        await program.methods
          .initializeFeed()
          .accounts({
            feed: feedPda,                  // Valid feed PDA
            feedAuthority: user1.publicKey, // Incorrect authority
            payer: user1.publicKey,         // Valid payer
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1]) // Signing as user1
          .rpc();

        // This should not succeed
        assert.fail("Expected an error when initializing the feed with the wrong authority");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, "A seeds constraint was violated"),
          "Error should indicate invalid authority"
        );
      }
    });

    it("Initializes the feed", async () => {
      // Initialize the Feed PDA
      await program.methods
        .initializeFeed()
        .accounts({
          feed: feedPda,
          feed_authority: feedAuthority,
          payer: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      // Fetch the feed account
      const feed = await program.account.feed.fetch(feedPda);
      assert.ok(feed.games.length === 0, "Feed should start with no games");
    });

    it("Cannot Initializes the feed twice", async () => {
      try {
        // Initialize the Feed PDA
        await program.methods
          .initializeFeed()
          .accounts({
            feed: feedPda,
            feed_authority: feedAuthority,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        assert.fail("Expected an error when initializing the feed again");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, "already in use"), err.logs)
      }
      // Fetch the feed account - feed should still be empty
      const feed = await program.account.feed.fetch(feedPda);
      assert.ok(feed.games.length === 0, "Feed should start with no games");
    });
  });

  describe("Game Initialization", async () => {
    it("user1 Initializes a new game", async () => {
      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId1, program.programId)
      await program.methods
        .initialize(gameId1, Buffer.from(bitmap))
        .accounts({
          feed: feedPda,
          game: gamePda,
          gameOwner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc({ commitment: "confirmed" });

      await checkGame(program, gamePda, user1.publicKey, gameId1, bitmap, 0, 0, gameBump) // Check the game
      await isGameInFeed(program, gamePda, feedPda);

      // await checkUserProfile(program, userProfile, user1.publicKey, gameCounter + 1, userProfileBump); // Check the userProfile (gameCounter should be incremented)
    });

    it("Fails to initialize a game with gameId that already exists", async () => {
      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId1, program.programId)
      try {
        await program.methods
          .initialize(gameId1, Buffer.from(bitmap))
          .accounts({
            feed: feedPda,
            game: gamePda,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc({ commitment: "confirmed" });
        assert.fail("Expected an error when initializing a game with a duplicate gameId");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, "already in use"), err.logs)
      }
      await checkGame(program, gamePda, user1.publicKey, gameId1, bitmap, 0, 0, gameBump)
    });

    it("Fails to initialize a game with gameId longer than 32 bytes", async () => {
      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId1, program.programId)
      try {
        await program.methods
          .initialize(gameId2, Buffer.from(bitmap))
          .accounts({
            feed: feedPda,
            game: gamePda,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc({ commitment: "confirmed" });
        assert.fail("Expected an error when initializing a game with a gameId too long");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, "Length of the seed is too long for address generation"), err.logs)
      }
    });


    it("Initializes a game with a fully filled grid (valid size)", async () => {
      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId3, program.programId)

      await program.methods
        .initialize(gameId3, Buffer.from(fullBitmap))
        .accounts({
          feed: feedPda,
          game: gamePda,
          gameOwner: user1.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc({ commitment: "confirmed" });

      await checkGame(program, gamePda, user1.publicKey, gameId3, fullBitmap, 0, 0, gameBump) // Check the game
      await isGameInFeed(program, gamePda, feedPda);
    });


    it("Fails to initialize a game with an oversized grid", async () => {
      const oversizedBitmap = new Uint8Array(513); // One byte too large for 64x64 grid
      oversizedBitmap.fill(0xff);

      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId4, program.programId)

      try {
        await program.methods
          .initialize(gameId4, Buffer.from(oversizedBitmap))
          .accounts({
            feed: feedPda,
            game: gamePda,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error when initializing with oversized grid");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, GAME_ERRORS.InvalidGrid), err.logs)
      }
    });

    it("Fails to initialize a game with an undersized grid", async () => {
      const undersizedBitmap = new Uint8Array(511); // One byte too small for 64x64 grid

      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId5, program.programId)

      try {
        await program.methods
          .initialize(gameId5, Buffer.from(undersizedBitmap))
          .accounts({
            feed: feedPda,
            game: gamePda,
            gameOwner: user1.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error when initializing with oversized grid");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, GAME_ERRORS.InvalidGrid), err.logs)
      }
    });
  });


  describe("Game Save Management", () => {
    it("user1 star a game", async () => {

      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId1, program.programId)
      const [starPda, starBump] = getStarAddress(user1.publicKey, gamePda, program.programId)

      await program.methods
        .starGame()
        .accounts({
          starUser: user1.publicKey,
          starGame: starPda,
          game: gamePda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      await checkStar(program, starPda, user1.publicKey, gamePda, starBump)
      await checkGame(program, gamePda, user1.publicKey, gameId1, bitmap, 0, 1, gameBump) // game.stars incremented
    });

    it("Fails to star again the same game", async () => {

      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId1, program.programId)
      const [starPda, starBump] = getStarAddress(user1.publicKey, gamePda, program.programId)

      try {
        await program.methods
          .starGame()
          .accounts({
            starUser: user1.publicKey,
            starGame: starPda,
            game: gamePda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Expected an error for duplicate game");
      } catch (err) {
        assert.isTrue(SolanaError.contains(err.logs, "already in use"), err.logs)
      }
    });

    it("user1 remove a starred game", async () => {
      const [gamePda, gameBump] = getGameAddress(user1.publicKey, gameId1, program.programId)
      const [starPda, starBump] = getStarAddress(user1.publicKey, gamePda, program.programId)

      await program.methods.unstarGame().accounts({
        starUser: user1.publicKey,
        starGame: starPda,
        game: gamePda,
      })
        .signers([user1]).rpc({ commitment: "confirmed" })
      await checkGame(program, gamePda, user1.publicKey, gameId1, bitmap, 0, 0, gameBump) // game.stars decremented
    })
  });
});

// --- Helper Functions ---
async function airdrop(connection: any, address: any, amount = 1_000_000_000) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    "confirmed"
  );
}

// async function checkUserProfile(
//   program: anchor.Program<GameOfLife>,
//   userProfile: anchor.web3.PublicKey,
//   expectedUser?: anchor.web3.PublicKey,
//   expectedGameCounter?: number,
//   expectedBump?: number
// ) {
//   const profile = await program.account.userProfile.fetch(userProfile);

//   if (expectedUser) {
//     assert.strictEqual(profile.user.toBase58(), expectedUser.toBase58(), "User should match the expected wallet");
//   }
//   if (expectedGameCounter !== undefined) {
//     assert.strictEqual(profile.gameCounter, expectedGameCounter, "Game counter should match");
//   }
//   if (expectedBump !== undefined) {
//     assert.strictEqual(profile.bump, expectedBump, "Bump should match");
//   }
// }



function stringToUtf8ByteArray(inputString: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(inputString);
}

// Function to pad a byte array with zeroes to a specified length
function padByteArrayWithZeroes(byteArray: Uint8Array, length: number): Uint8Array {
  if (byteArray.length >= length) {
    return byteArray;
  }

  const paddedArray = new Uint8Array(length);
  paddedArray.set(byteArray, 0);
  return paddedArray;
}

async function checkGame(
  program: anchor.Program<GameOfLife>,
  gameKey: anchor.web3.PublicKey,
  expectedOwner?: anchor.web3.PublicKey,
  expectedGameId?: string,
  expectedAliveCells?: Uint8Array,
  expectedIteration?: number,
  expectedStars?: number,
  expectedBump?: number
) {
  const game = await program.account.game.fetch(gameKey);
  if (expectedOwner) {
    assert.strictEqual(game.gameAuthor.toBase58(), expectedOwner.toBase58(), "Game owner should match the expected owner");
  }
  if (expectedGameId) {
    const utf8ByteArray_id = stringToUtf8ByteArray(expectedGameId);
    const paddedByteArray_id = padByteArrayWithZeroes(utf8ByteArray_id, 32);
    assert.strictEqual(game.gameId.toString(), paddedByteArray_id.toString(), "Game ID should match the expected ID");
  }
  if (expectedAliveCells) {
    assert.deepStrictEqual(
      new Uint8Array(game.aliveCells),
      expectedAliveCells,
      "Alive cells bitmap should match the expected bitmap"
    );
  }
  if (expectedIteration !== undefined) {
    assert.strictEqual(game.iteration.toNumber(), expectedIteration, "Iteration should match the expected value");
  }
  if (expectedStars !== undefined) {
    assert.strictEqual(game.stars.toNumber(), expectedStars, "Stars should match the expected count");
  }
  if (expectedBump !== undefined) {
    assert.strictEqual(game.bump, expectedBump, "Bump should match");
  }
}

function validateBitmapSize(bitmap: Uint8Array, maxSize: number) {
  if (bitmap.length > maxSize) {
    throw new Error(`Bitmap size ${bitmap.length} exceeds maximum allowed size of ${maxSize}`);
  }
}


async function checkStar(
  program: anchor.Program<GameOfLife>,
  starKey: anchor.web3.PublicKey,
  expectedStarUser?: anchor.web3.PublicKey,
  expectedGame?: anchor.web3.PublicKey,
  expectedBump?: number
) {
  const star = await program.account.star.fetch(starKey);
  if (expectedStarUser) {
    assert.strictEqual(star.starUser.toString, expectedStarUser.toString, "Star user should match the expected user");
  }
  if (expectedGame) {
    assert.strictEqual(star.game.toString, expectedGame.toString, "Game should match the expected game");
  }
  if (expectedBump !== undefined) {
    assert.strictEqual(star.bump, expectedBump, "Bump should match");
  }
}

async function isGameInFeed(program, gamePda, feedPda) {
  const feed = await program.account.feed.fetch(feedPda);
  feed.games.forEach(game => {
    if (game.equals(gamePda)) {
      assert.ok(true, "Game should be in the feed");
    }
  });
}

function getUserProfileAddress(userPublicKey, programId) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode(USER_SEED),
      userPublicKey.toBuffer()
    ],
    programId
  );
}

function getGameAddress(ownerKey, gameId, programId) {
  const paddedGameId = new Uint8Array(32);
  const encodedGameId = anchor.utils.bytes.utf8.encode(gameId);
  paddedGameId.set(encodedGameId.slice(0, Math.min(encodedGameId.length, 32)));
  const addr = anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode(GAME_SEED),
      ownerKey.toBuffer(),
      anchor.utils.bytes.utf8.encode(gameId),
    ],
    programId
  );
  return addr;
}

function getStarAddress(userPublicKey: anchor.web3.PublicKey, gamePublicKey: anchor.web3.PublicKey, programId: anchor.web3.PublicKey) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [
      anchor.utils.bytes.utf8.encode(STAR_SEED),
      userPublicKey.toBuffer(),
      gamePublicKey.toBuffer(),
    ],
    programId
  );
}

class SolanaError {
  static contains(logs, error): boolean {
    if (!logs) return false;
    return logs.some(log => log.includes(error));
  }
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