use anchor_lang::prelude::*;
use crate::states::*;

use crate::errors::GameError;


pub fn star_game(ctx: Context<StarGameContext>) -> Result<()> {
    let game = &mut ctx.accounts.game;
    let stared_game = &mut ctx.accounts.stared_game;

    msg!("Stars before: {}", game.stars);
    game.stars = game.stars.checked_add(1).ok_or(GameError::MaxStarsReached)?;
    msg!("Stars after: {}", game.stars);

    // Populate the GameSave PDA
    stared_game.star_user = ctx.accounts.star_user.key();
    stared_game.game = game.key();
    stared_game.bump = ctx.bumps.stared_game;
    

    Ok(())
}


#[derive(Accounts)]
pub struct StarGameContext<'info> {
    #[account(mut)]
    pub star_user: Signer<'info>, // User adding the game

    #[account(
        init,
        payer = star_user,
        space = 8 + Star::LEN,
        seeds = [
            STAR_SEED.as_bytes(),
            star_user.key().as_ref(),
            game.key().as_ref(),
        ],
        bump
    )]
    pub stared_game: Account<'info, Star>, // New save entry

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
    pub system_program: Program<'info, System>, // System program
}



