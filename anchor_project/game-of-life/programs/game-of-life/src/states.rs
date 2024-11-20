use anchor_lang::prelude::*;

pub const USER_SEED: &str = "USER_SEED";
pub const GAME_SEED: &str = "GAME_SEED";
pub const FEED_SEED: &str = "FEED_SEED";
pub const NFT_SEED: &str = "NFT_SEED";

#[account]
pub struct GameConfig {
    pub game_owner: Pubkey,      // Owner of the game
    pub alive_cells: Vec<(u8, u8)>, // List of alive cells
    pub iteration: u64,    // Current iteration of the game
    pub is_public: bool,   // Whether the game is shared in the feed
    pub bump: u8,          // Bump seed for PDA
}

impl GameConfig {
    pub const MAX_ALIVE_CELLS: usize = 1024; // Limit for alive cells to prevent unbounded storage
    pub const LEN: usize = 32 +             // Pubkey
                           4 + (2 * 1024) + // Vec<(u8, u8)> for alive_cells
                           8 +              // u64 for iteration
                           1 +              // bool for is_public
                           1;               // Bump
}

#[account]
pub struct UserProfile {
    pub user: Pubkey,             // The wallet address of the user
    pub saved_games: Vec<Pubkey>, // List of GameConfig PDAs created or saved by the user
    // pub minted_nfts: Vec<Pubkey>,   // List of NFT metadata PDAs minted by the user
    pub bump: u8, // PDA bump for security
}

impl UserProfile {
    pub const MAX_SAVED_GAMES: usize = 10; // Limit the number of saved games
                                           // pub const MAX_MINTED_NFTS: usize = 10;    // Limit the number of minted NFTs
    pub const LEN: usize = 32 +               // Pubkey (user)
                          4 + (32 * 10) +     // Vec<Pubkey> for saved_games
                        //   4 + (32 * 10) +     // Vec<Pubkey> for minted_nfts
                          1; // Bump
}

#[account]
pub struct Feed {
    pub public_games: Vec<Pubkey>, // List of public GameConfig PDAs
}

impl Feed {
    pub const MAX_PUBLIC_GAMES: usize = 100;  // Arbitrary limit to prevent oversized accounts
    pub const LEN: usize = 4 + (32 * 100);    // Vec<Pubkey> for public_games
}

// #[account]
// pub struct NftMetadata {
//     pub nft_id: u64,               // Unique identifier for the NFT
//     pub owner: Pubkey,             // Owner of the NFT
//     pub game_state: [u8; 1024],    // Fixed-size grid representing the NFT state
//     pub metadata_uri: String,      // URI to the off-chain metadata
// }
