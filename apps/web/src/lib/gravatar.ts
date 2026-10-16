// https://docs.gravatar.com/embedding-profile-card/
// The observed embedded card fits this viewport. oEmbed's 351 x 436 response
// adds inner whitespace, so provider geometry must not override our layout.
export function getGravatarCard(username: string) {
  return {
    src: `https://gravatar.com/${encodeURIComponent(username)}.card`,
    width: 336,
    height: 402,
  };
}
