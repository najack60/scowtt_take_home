export type UserProfile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  favoriteMovie: string | null;
};

export type MovieFact = {
  movie: string;
  content: string;
  createdAt: string;
};

export type FactResponse = { fact: MovieFact | null };
export type ApiErrorResponse = { error: string };
