// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

import { Program } from "@coral-xyz/anchor";
import { GameOfLife } from "../target/types/game_of_life";

const anchor = require("@coral-xyz/anchor");

const FEED_SEED = "FEED_SEED"

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  const program = anchor.workspace.GameOfLife as Program<GameOfLife>;

  try {
    const [feedPda, feedBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from(FEED_SEED)], program.programId);
    const [feedAuthority, feedAuthorityBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("feed_authority")], program.programId);

    const feedAccount = await provider.connection.getAccountInfo(feedPda);
    if (feedAccount) {
      console.log("Feed account already exist :", feedPda.toBase58());
      return;
    }
    console.log("Initializing Feed account...");
    let retries = 3;
    while (retries > 0) {
      try {
        const tx = await program.methods
          .initializeFeed()
          .accountsStrict({
            feed: feedPda,
            feedAuthority: feedAuthority,
            payer: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        await provider.connection.confirmTransaction(tx);

        const verifyFeed = await provider.connection.getAccountInfo(feedPda);
        if (verifyFeed) {
          console.log("Feed account initialized:", feedPda.toBase58());
          console.log("Transaction signature:", tx);
          return;
        }
        throw new Error("Feed account not found");
      } catch (error) {
        console.error(`Attempt ${4 - retries}/3 failed:`, error);
        retries--;
        if (retries === 0) {
          throw new Error("Failed to initialize feed after 3 attempts");
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("Deployment failed:", error);
    process.exit(1);
  }
};
