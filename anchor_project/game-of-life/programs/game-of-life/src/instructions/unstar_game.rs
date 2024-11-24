use anchor_lang::prelude::*;
use crate::states::*;

use crate::errors::GameError;

pub fn unstar_game(_ctx: Context<RemoveStarredGame>) -> Result<()> {
    let game = &mut _ctx.accounts.game;
    game.stars = game.stars.checked_sub(1).ok_or(GameError::MinStarsReached)?;

    Ok(())
}


#[derive(Accounts)]
pub struct RemoveStarredGame<'info> {
    #[account(mut)]
    pub star_user: Signer<'info>, // user removing the game

    #[account(
        mut,
        close=star_user,
        seeds = [
            STAR_SEED.as_bytes(),
            star_user.key().as_ref(),
            game.key().as_ref(),
        ],
        bump = star_game.bump,
    )]
    pub star_game: Account<'info, Star>, // Game save entry to remove

    #[account(
        mut,
        seeds = [
            GAME_SEED.as_bytes(),
            game.game_author.key().as_ref(),
            game.game_id[..game.id_length as usize].as_ref(),
        ],
        bump = game.bump
    )]
    pub game: Account<'info, Game>, // The game added to the profile
}

