// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@coral-xyz/anchor");
const FEED_SEED = "FEED_SEED"

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);

  // Add your deploy script here.

  // Initialize the feed
  const initializeFeed = async () => {
    const program = anchor.workspace.GameOfLife;
    const [feedPda, feedBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from(FEED_SEED)], program.programId);
    const [feedAuthority, feedAuthorityBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("feed_authority")], program.programId);

    const feedAccount = await provider.connection.getAccountInfo(feedPda);
    if (feedAccount) {
      console.log("Feed account already exist :", feedPda.toBase58());
      return;
    }

    // Initialize the feed account 
    console.log("Initializing Feed account...");
    await program.methods
      .initializeFeed()
      .accounts({
        feed: feedPda,
        feedAuthority: feedAuthority,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Feed account initialized:", feedPda.toBase58());
  }

  initializeFeed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
};
