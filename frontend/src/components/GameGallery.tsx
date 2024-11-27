import { AnchorProvider, getProvider, Program, setProvider } from '@coral-xyz/anchor';
import { FC, useEffect, useState } from 'react';
import { GameOfLife } from './game_of_life';
import idl from './game_of_life.json'
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { FEED_SEED } from '../constants';
import { CreateGameOfLife } from './GameOfLife';
import { GamePlayer } from './GamePlayer';
import { GameCreator } from './GameCreator';

const idl_string = JSON.stringify(idl)
const idl_object = JSON.parse(idl_string)
const programID = new PublicKey(idl.address)

interface GameData {
    gameId: string;
    gameAuthor: PublicKey;
    aliveCells: boolean[][];
    stars: number;
    pubkey: PublicKey;
}

interface GameBoxProps {
    game: GameData;
    onClick?: () => void;
    isOwner: boolean;
}

const GameBox: FC<GameBoxProps> = ({ game, onClick, isOwner }) => {
    // Create a mini preview of the game using alive_cells
    const renderPreview = () => {
        return (
            <div className="grid grid-cols-8 gap-[1px]">
                {game.aliveCells.slice(0, 8).map((row, rowIndex) => (
                    row.slice(0, 8).map((cell, colIndex) => (
                        <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`w-4 h-4 ${cell ? 'bg-indigo-500' : 'bg-white'} border border-gray-200`}
                        />
                    ))
                ))}
            </div>
        );
    };

    return (
        <div
            className="flex flex-col items-center cursor-pointer transform hover:scale-105 transition-transform"
            onClick={onClick}
        >
            <span className="text-sm font-medium text-white">{game.gameId}</span>
            <div className="w-32 h-32 bg-white border-2 border-gray-200 rounded-lg shadow-md mb-2 overflow-hidden">
                <div className="p-1 h-full flex items-center justify-center">
                    {renderPreview()}
                </div>
            </div>
            <div className="flex items-center mt-1 text-sm text-gray-500">
                <span>⭐ {game.stars}</span>
                {isOwner && <span className="ml-2">(Your Game)</span>}
            </div>
        </div>
    );
};

interface GameSectionProps {
    title: string;
    games: GameData[];
    onGameSelect: (game: GameData) => void;
    currentWallet: PublicKey | null;
}

const GameSection: FC<GameSectionProps> = ({ title, games, onGameSelect, currentWallet }) => {
    return (
        <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 text-white">{title}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {games.map((game, index) => (
                    <GameBox 
                        key={index} 
                        game={game} 
                        onClick={() => onGameSelect(game)}
                        isOwner={currentWallet?.equals(game.gameAuthor) || false}
                    />
                ))}
            </div>
        </div>
    );
};

export const GameGallery: FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [allGamesData, setAllGamesData] = useState<GameData[]>([]);
    const [myGames, setMyGames] = useState<GameData[]>([]);
    const [starredGames, setStarredGames] = useState<GameData[]>([]);
    const [otherGames, setOtherGames] = useState<GameData[]>([]);
    const [selectedGame, setSelectedGame] = useState<GameData | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Convert byte array to string, removing null bytes
    const byteArrayToString = (bytes: number[]): string => {
        // Filter out null bytes (0) and convert to string
        const nonNullBytes = bytes.filter(byte => byte !== 0);
        const uint8Array = new Uint8Array(nonNullBytes);
        try {
            return new TextDecoder().decode(uint8Array);
        } catch (error) {
            console.error("Error decoding bytes:", error);
            return "Unnamed Game"; // Fallback value
        }
    };

    function deserializeBitmap(bitmap: Uint8Array): Array<[number, number]> {
        const gridSize = 64;
        const aliveCells: Array<[number, number]> = [];
        for (let byteIndex = 0; byteIndex < bitmap.length; byteIndex++) {
            const byte = bitmap[byteIndex];
            for (let bitOffset = 0; bitOffset < 8; bitOffset++) {
                if ((byte & (1 << bitOffset)) !== 0) {
                    const bitIndex = byteIndex * 8 + bitOffset;
                    const row = Math.floor(bitIndex / gridSize);
                    const col = bitIndex % gridSize;
                    aliveCells.push([row, col]);
                }
            }
        }
        return aliveCells;
    }

    function convertToGrid(aliveCellsCoords: Array<[number, number]>): boolean[][] {
        const gridSize = 64;
        const grid = Array(gridSize).fill(false).map(() => Array(gridSize).fill(false));
        aliveCellsCoords.forEach(([row, col]) => {
            if (row < gridSize && col < gridSize) {
                grid[row][col] = true;
            }
        });
        return grid;
    }

    const transformGameData = (gameData: any, gamePubkey: PublicKey): GameData => {
        console.log("Raw gameId:", gameData.gameId);
        const gameIdString = byteArrayToString(Array.from(gameData.gameId));
        console.log("Converted gameId:", gameIdString);
        return {
            gameId: gameIdString,
            gameAuthor: gameData.gameAuthor,
            aliveCells: convertToGrid(deserializeBitmap(new Uint8Array(gameData.aliveCells))),
            stars: gameData.stars ? gameData.stars.toNumber() : 0,
            pubkey: gamePubkey,
        };
    };

    const fetchGames = async () => {
        const getProvider = () => {
            const provider = new AnchorProvider(connection, wallet, AnchorProvider.defaultOptions())
            setProvider(provider)
            return provider
        };

        setIsLoading(true);
        try {
            const anchProvider = getProvider();
            const program = new Program<GameOfLife>(idl_object, anchProvider);

            const programAccounts = await connection.getParsedProgramAccounts(programID);

            const [feedPda, feedBump] = PublicKey.findProgramAddressSync([Buffer.from(FEED_SEED)], program.programId);

            const feedAccount = await program.account.feed.fetch(feedPda);

            const gamePromises = feedAccount.games.map(async (gamePubkey) => {
                const gameData = await program.account.game.fetch(gamePubkey);
                // Transform the data as needed
                return transformGameData(gameData, gamePubkey);
            });

            const games = await Promise.all(gamePromises);

            console.log("games", games);
            // Organize games into categories
            const myGames = games.filter(game =>
                game.gameAuthor.equals(wallet.publicKey!)
            );
            const starred = games.filter(game => game.stars > 0)
                .sort((a, b) => b.stars - a.stars);
            const others = games.filter(game =>
                !game.gameAuthor.equals(wallet.publicKey!)
            );

            setMyGames(myGames);
            setStarredGames(starred);
            setOtherGames(others);
        } catch (error) {
            console.error("Error fetching games:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGameSelect = (game: GameData) => {
        setSelectedGame(game);
    };

    if (isCreating) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold text-white">Create New Game</h1>
                    <button
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                        onClick={() => setIsCreating(false)}
                    >
                        Back to Gallery
                    </button>
                </div>
                <GameCreator 
                    onGameCreated={() => {
                        setIsCreating(false);
                        fetchGames();
                    }}
                />
            </div>
        );
    }

    if (selectedGame) {
        return (
            <div className="container mx-auto px-4 py-8">
                <GamePlayer 
                    gameData={selectedGame}
                    onExit={() => setSelectedGame(null)}
                />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-white">Game Gallery</h1>
                <div className="space-x-4">
                    <button
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                        onClick={fetchGames}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Loading...' : 'Refresh Games'}
                    </button>
                    <button
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                        onClick={() => setIsCreating(true)}
                    >
                        Create New Game
                    </button>
                </div>
            </div>

            {wallet.publicKey && myGames.length > 0 && (
                <GameSection 
                    title="My Games" 
                    games={myGames} 
                    onGameSelect={handleGameSelect}
                    currentWallet={wallet.publicKey}
                />
            )}
            {starredGames.length > 0 && (
                <GameSection 
                    title="Starred Games" 
                    games={starredGames} 
                    onGameSelect={handleGameSelect}
                    currentWallet={wallet.publicKey}
                />
            )}
            {otherGames.length > 0 && (
                <GameSection 
                    title="Other Games" 
                    games={otherGames} 
                    onGameSelect={handleGameSelect}
                    currentWallet={wallet.publicKey}
                />
            )}

            {!isLoading && myGames.length === 0 && starredGames.length === 0 && otherGames.length === 0 && (
                <div className="text-center text-gray-400 mt-8">
                    No games found. Click "Refresh Games" to fetch games or create a new one!
                </div>
            )}
        </div>
    );
};