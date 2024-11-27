import type { NextPage } from "next";
import Head from "next/head";
import { GalleryView } from "../views/gallery";

const Gallery: NextPage = (props) => {
  return (
    <div>
      <Head>
        <title>Game of Life - Gallery</title>
        <meta
          name="description"
          content="Game of Life Gallery"
        />
      </Head>
      <GalleryView />
    </div>
  );
};

export default Gallery;
