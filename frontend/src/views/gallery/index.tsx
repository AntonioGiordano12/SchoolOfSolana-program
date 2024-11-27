import { FC } from 'react';
import { GameGallery } from '../../components/GameGallery';

export const GalleryView: FC = ({ }) => {
  return (
    <div className="md:hero mx-auto p-4">
      <div className="md:hero-content flex flex-col">
        <h1 className="text-center text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-fuchsia-500 mb-4">
          Game Gallery
        </h1>
        <GameGallery />
      </div>
    </div>
  );
};
