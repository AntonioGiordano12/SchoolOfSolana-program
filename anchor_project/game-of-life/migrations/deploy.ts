// migrations/deploy.ts
import { Program, Wallet, AnchorProvider } from "@coral-xyz/anchor";
import { GameOfLife } from "../target/types/game_of_life";
import { Connection, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const anchor = require("@coral-xyz/anchor");
const FEED_SEED = "FEED_SEED"

async function main() {
    console.log("Starting feed initialization...");
    
    // Set up connection to devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    
    // Load wallet from id.json
    const walletKeypair = Keypair.fromSecretKey(
        Buffer.from(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'id.json'), 'utf-8')))
    );
    const wallet = new Wallet(walletKeypair);
    
    // Create provider
    const provider = new AnchorProvider(connection, wallet, {
        commitment: "confirmed"
    });
    anchor.setProvider(provider);

    const program = anchor.workspace.GameOfLife as Program<GameOfLife>;

    try {
        const [feedPda, feedBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from(FEED_SEED)], program.programId);
        const [feedAuthority, feedAuthorityBump] = anchor.web3.PublicKey.findProgramAddressSync([Buffer.from("feed_authority")], program.programId);

        console.log("Program ID:", program.programId.toBase58());
        console.log("Feed PDA:", feedPda.toBase58());
        console.log("Feed Authority:", feedAuthority.toBase58());

        const tx = await program.methods
            .initializeFeed()
            .accountsStrict({
                feed: feedPda,
                feedAuthority: feedAuthority,
                payer: provider.wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();

        console.log("Feed initialized! Transaction:", tx);
    } catch (error) {
        console.error("Error:", error);
        if (error.logs) {
            console.error("Program Logs:", error.logs);
        }
        process.exit(1);
    }
}

main().catch(console.error);