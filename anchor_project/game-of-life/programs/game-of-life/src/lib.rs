use crate::instructions::*;
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod states;

declare_id!("2f3VX8BDhBi88secSvgXYnorQcBdyG2ZFwKWcxmMcbAv");

#[program]
pub mod game_of_life {
    use super::*;

    pub fn initialize(ctx: Context<InitializeGame>, alive_cells: Vec<u8>) -> Result<()> {
        instructions::initialize_game(ctx, alive_cells)
    }

    pub fn initialize_user_profile(ctx: Context<InitializeUserProfile>) -> Result<()> {
        initialize_user(ctx)
    }

    pub fn add_game_to_profile(ctx: Context<AddGameToProfile>) -> Result<()> {
        add_game(ctx)
    }

    pub fn remove_game_from_profile(ctx: Context<RemoveGameFromProfile>) -> Result<()> {
        remove_game(ctx)
    }

}



// fn deserialize_bitmap(bitmap: &[u8]) -> Vec<(u8, u8)> {
//     let mut alive_cells = Vec::new();
//     for (byte_index, &byte) in bitmap.iter().enumerate() {
//         for bit_offset in 0..8 {
//             if (byte & (1 << bit_offset)) != 0 {
//                 let bit_index = byte_index * 8 + bit_offset;
//                 let row = (bit_index / 64) as u8;
//                 let col = (bit_index % 64) as u8;
//                 alive_cells.push((row, col));
//             }
//         }
//     }
//     alive_cells
// }

