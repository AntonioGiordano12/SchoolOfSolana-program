use anchor_lang::prelude::*;
use crate::states::*;

use crate::errors::GameError;

pub fn initialize_game(
    ctx: Context<InitializeGame>,
    alive_cells: Vec<(u8, u8)>, 
) -> Result<()> {
    let initialized_game = &mut ctx.accounts.game_config;

    // Validate alive_cells size
    require!(
        alive_cells.len() <= GameConfig::MAX_ALIVE_CELLS,
        GameError::TooManyAliveCells
    );
    
    initialized_game.game_owner = ctx.accounts.game_owner.key();
    initialized_game.alive_cells = alive_cells;
    initialized_game.iteration = 0;
    initialized_game.bump = ctx.bumps.game_config;
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub game_owner: Signer<'info>,
    #[account(
        init,   
        payer = game_owner,
        space = 8 + GameConfig::LEN,
        seeds = [
            GAME_SEED.as_bytes(),
            game_owner.key().as_ref(),
            b"game1",
            ],
        bump)]
    pub game_config: Account<'info, GameConfig>,
    pub system_program: Program<'info, System>,
}

