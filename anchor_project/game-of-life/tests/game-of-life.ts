import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { GameOfLife } from "../target/types/game_of_life";
import { assert } from "chai";

const USER_SEED = "USER_SEED";
const GAME_SEED = "GAME_SEED";
const FEED_SEED = "FEED_SEED";
const NFT_SEED  = "NFT_SEED";


describe("Initialize game-of-life", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.GameOfLife as Program<GameOfLife>;
  const user = provider.wallet;

  let userProfile: anchor.web3.PublicKey;
  let gameConfig: anchor.web3.PublicKey;
  let feed: anchor.web3.PublicKey;

  before(async () => {
    // Derive the PDAs
    [userProfile] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("USER_SEED"), user.publicKey.toBuffer()],
      program.programId
    );

    [gameConfig] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("GAME_SEED"), user.publicKey.toBuffer(), Buffer.from("game1")],
      program.programId
    );

    [feed] = await anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("FEED_SEED")],
      program.programId
    );
  });

   // 1. Game Initialization
   it("Initializes a new game (happy path)", async () => {
    const aliveCells = [
      [1, 1],
      [1, 2],
      [1, 3],
    ]; // Blinker pattern

    await program.methods
      .initializeGame(aliveCells)
      .accounts({
        gameConfig,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const game = await program.account.gameConfig.fetch(gameConfig);
    assert.equal(game.iteration, 0, "Iteration should start at 0");
    assert.deepEqual(game.aliveCells, aliveCells, "Alive cells should match initialized value");
  });

  it("Initializes a new user profile (happy path)", async () => {
    await program.methods
      .initializeUserProfile()
      .accounts({
        userProfile,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  
    const profile = await program.account.userProfile.fetch(userProfile);
    assert.equal(profile.user.toBase58(), user.publicKey.toBase58(), "User should match the wallet");
    assert.deepEqual(profile.savedGames, [], "Saved games should initially be empty");
  });
  
  
  it("Fails to reinitialize an existing user profile (error path)", async () => {
    try {
      await program.methods
        .initializeUserProfile()
        .accounts({
          userProfile,
          user: user.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
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

export async function airdrop(
  connection: any,
  address: any,
  amount = 500_000_000_000
) {
  await connection.confirmTransaction(
    await connection.requestAirdrop(address, amount),
    'confirmed'
  );
}