use anchor_lang::prelude::*;
use crate::states::*;

// use crate::errors::GameError;


pub fn add_game(ctx: Context<AddGameToProfile>) -> Result<()> {
    let user_profile = &mut ctx.accounts.user_profile;
    let game_save = &mut ctx.accounts.game_save;

    // Populate the GameSave PDA
    game_save.user = ctx.accounts.user.key();
    game_save.game = ctx.accounts.game_config.key();
    game_save.saved_at = Clock::get()?.unix_timestamp;
    game_save.bump = ctx.bumps.game_save;

    // Optional: Update user profile metadata if necessary
    user_profile.game_counter += 1;

    msg!("Derived user_profile PDA: {:?}", ctx.accounts.user_profile.key());
    msg!("Derived game_save PDA: {:?}", ctx.accounts.game_save.key());
    
    Ok(())
}


#[derive(Accounts)]
pub struct AddGameToProfile<'info> {
    #[account(mut)]
    pub user: Signer<'info>, // User adding the game

    #[account(
        init,
        payer = user,
        space = 8 + GameSave::LEN,
        seeds = [
            GAME_SAVE_SEED.as_bytes(),
            user.key().as_ref(),
        ],
        bump
    )]
    pub game_save: Account<'info, GameSave>, // New save entry

    #[account(
        mut,
        seeds = [
            USER_SEED.as_bytes(),
            user.key().as_ref(), // Reference user directly
        ],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>, // The user's profile

    #[account(
        seeds = [
            GAME_SEED.as_bytes(),
            game_config_owner.key().as_ref(),
        ],
        bump = game_config.bump
    )]
    pub game_config: Account<'info, GameConfig>, // The game being saved

    pub game_config_owner: Signer<'info>, // Owner of the game

    pub system_program: Program<'info, System>, // System program
}


