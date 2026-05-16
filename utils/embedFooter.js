const GREENVILLE_FOOTER_TEXT = 'Greenville Hub™';
const GREENVILLE_FOOTER_ICON_URL = 'https://media.discordapp.net/attachments/1492958669200031814/1505251172150411466/kiaodogcircle_2_.png?ex=6a09f1e5&is=6a08a065&hm=cc710655fb31f9ddd95ec63a37b5b7d48d47ca0308917ecbf724b6415cc3b95d&=&format=webp&quality=lossless&width=818&height=818';

function greenvilleFooter() {
  return {
    text: GREENVILLE_FOOTER_TEXT,
    iconURL: GREENVILLE_FOOTER_ICON_URL,
  };
}

function greenvilleAuthor() {
  return {
    name: GREENVILLE_FOOTER_TEXT,
    iconURL: GREENVILLE_FOOTER_ICON_URL,
  };
}

function applyGreenvilleFooter(embed, source) {
  return embed
    .setAuthor(greenvilleAuthor())
    .setFooter(greenvilleFooter(source));
}

module.exports = {
  GREENVILLE_FOOTER_TEXT,
  GREENVILLE_FOOTER_ICON_URL,
  greenvilleAuthor,
  greenvilleFooter,
  applyGreenvilleFooter,
};
