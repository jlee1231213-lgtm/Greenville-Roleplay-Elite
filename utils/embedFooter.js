const GREENVILLE_FOOTER_TEXT = 'Greenville Hub™';

function resolveGuild(source) {
  return source?.guild || source;
}

function greenvilleFooter(source) {
  const guild = resolveGuild(source);
  const iconURL = guild?.iconURL?.({ extension: 'png', size: 128 }) || undefined;

  return {
    text: GREENVILLE_FOOTER_TEXT,
    iconURL,
  };
}

function applyGreenvilleFooter(embed, source) {
  return embed.setFooter(greenvilleFooter(source));
}

module.exports = {
  GREENVILLE_FOOTER_TEXT,
  greenvilleFooter,
  applyGreenvilleFooter,
};
