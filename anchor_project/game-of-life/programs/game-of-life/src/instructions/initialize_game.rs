use crate::states::*;
use anchor_lang::prelude::*;

use crate::errors::GameError;

pub fn initialize_game(
    ctx: Context<InitializeGame>,
    game_id: String,
    alive_cells: Vec<u8>,
) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let feed = &mut ctx.accounts.feed;

    require!(
        game_id.as_bytes().len() <= ID_LENGTH,
        GameError::IDTooLong
    );

    require!(
        alive_cells.len() <= Game::MAX_ALIVE_CELLS && alive_cells.len() >= Game::MAX_ALIVE_CELLS,
        GameError::InvalidGrid
    );

    let mut game_id_data: [u8; 32] = [0u8; ID_LENGTH];
    game_id_data[..game_id.as_bytes().len()].copy_from_slice(game_id.as_bytes());
    game.game_id = game_id_data;

    // Validate alive_cells size

    game.id_length = game_id.len() as u8;
    game.game_author = ctx.accounts.game_owner.key();
    game.alive_cells.copy_from_slice(&alive_cells);
    game.iteration = 0;
    game.stars = 0;
    game.bump = ctx.bumps.game;

    require!(feed.games.len() < Feed::MAX_GAMES, GameError::FeedFull);

    feed.games.push(game.key());

    Ok(())
}

#[derive(Accounts)]
#[instruction(game_id: String)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub game_owner: Signer<'info>, // The game owner

    #[account(
        mut,
        seeds = [FEED_SEED.as_bytes()],
        bump = feed.bump,
    )]
    pub feed: Account<'info, Feed>, // Global feed account

    #[account(
        init,
        payer = game_owner,
        space = 8 + Game::LEN,
        seeds = [
            GAME_SEED.as_bytes(),
            game_owner.key().as_ref(),
            game_id.as_bytes(),
        ],
        bump
    )]
    pub game: Account<'info, Game>, // New game config
    pub system_program: Program<'info, System>, // System program
}
