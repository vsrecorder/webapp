export type MainCard = {
  name: string;
  image_url: string;
};

export type DeckTypeData = {
  title: string;
  main_cards: MainCard[];
};
