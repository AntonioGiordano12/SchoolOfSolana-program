use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Too many saved games.")]
    TooManySavedGames,
    #[msg("This game has already been saved.")]
    GameAlreadySaved,
    #[msg("The specified game is not saved.")]
    GameNotSaved,
    #[msg("Too many alive cells")]
    TooManyAliveCells,
}

