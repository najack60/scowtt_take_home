export function validateMovie(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return { error: "Please enter your favorite movie.", value: "" };
  }

  const movie = value.trim();
  if (movie.length < 1 || movie.length > 100) {
    return {
      error: "Enter a movie title between 1 and 100 characters.",
      value,
    };
  }

  return { movie };
}
