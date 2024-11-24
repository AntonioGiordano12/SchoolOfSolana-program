use anchor_lang::prelude::*;

pub const USER_SEED: &str = "USER_SEED";
pub const GAME_SEED: &str = "GAME_SEED";
pub const STAR_SEED: &str = "STAR_SEED";
pub const FEED_SEED: &str = "FEED_SEED";
pub const NFT_SEED: &str = "NFT_SEED";

pub const ID_LENGTH: usize = 32;

#[account]
pub struct Game {
    pub game_author: Pubkey,       // Owner of the game
    pub game_id: [u8; ID_LENGTH], // Name of the game
    pub id_length: u8,
    pub alive_cells: [u8; 512], // Bitmap representing 64x64 grid (64 * 64 / 8 = 512 bytes) of alive cells
    pub iteration: u64,         // Current iteration of the game
    pub stars: u64,             // number of stars
    pub bump: u8,               // Bump seed for PDA
}

impl Game {
    pub const GRID_SIZE: usize = 64;
    pub const MAX_ALIVE_CELLS: usize = 512; // Limit for alive cells to prevent unbounded storage
    pub const LEN: usize = 32 +              // Pubkey
                           ID_LENGTH +       // Game ID [u8; ID_LENGTH]
                            1 +              // id_length u8
                           512 +             // bitmap [u8; 512]
                           8 +               // Iteration u64
                           8 +               // Number of stars u64
                           1; // Bump u8
}

#[account]
pub struct UserProfile {
    pub user: Pubkey,      // The wallet address of the user
    pub game_counter: u32, // Numebr of game the user created
    // pub minted_nfts: Vec<Pubkey>,    // List of NFT metadata PDAs minted by the user
    pub bump: u8, // PDA bump for security
}

impl UserProfile {
    pub const MAX_SAVED_GAMES: usize = 10; // Limit the number of saved games
                                           // pub const MAX_MINTED_NFTS: usize = 10;    // Limit the number of minted NFTs
    pub const LEN: usize = 32 +               // Pubkey (user)
                            4 +               // Total games saved
                        //   4 + (32 * 10) +  // Vec<Pubkey> for minted_nfts
                          1; // Bump
}

#[account]
pub struct Star {
    // Staring a game
    pub star_user: Pubkey, // The user who saved the game
    pub game: Pubkey,      // The game being saved
    pub bump: u8,          // PDA bump for security
}

impl Star {
    pub const LEN: usize = 32 +  // Pubkey (user)
                           32 +  // Pubkey (game)
                            1; // Bump
}

#[account]
pub struct Feed {
    pub games: Vec<Pubkey>, // List of all public game PDAs
    pub bump: u8,           // PDA bump
}

impl Feed {
    pub const MAX_GAMES: usize = 319; // Adjusted limit based on 10240 byte max
    pub const LEN: usize = 4 + (32 * Self::MAX_GAMES) + 1;
}

// #[account]
// pub struct NftMetadata {
//     pub nft_id: u64,               // Unique identifier for the NFT
//     pub owner: Pubkey,             // Owner of the NFT
//     pub game_state: [u8; 1024],    // Fixed-size grid representing the NFT state
//     pub metadata_uri: String,      // URI to the off-chain metadata
// }
