use anchor_lang::prelude::*;
use crate::states::*;

#[derive(Accounts)]
pub struct InitializeFeed<'info> {
    #[account(
        init,
        payer = payer,
        space = 8 + Feed::LEN,
        seeds = [FEED_SEED.as_bytes()],
        bump
    )]
    pub feed: Account<'info, Feed>, // Feed account
    #[account(mut)]
    pub payer: Signer<'info>,       // Payer of the transaction
    pub system_program: Program<'info, System>, // System program
}

pub fn initialize_feed(ctx: Context<InitializeFeed>) -> Result<()> {
    let feed = &mut ctx.accounts.feed;

    // Initialize the feed with an empty list of games
    feed.games = Vec::new();
    feed.bump = ctx.bumps.feed;

    Ok(())
}
