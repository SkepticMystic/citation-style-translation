// Source: https://stackoverflow.com/questions/4320958/regular-expression-for-recognizing-in-text-citations
export const authorReg = "(?:[A-Z][A-Za-z'`-]+)";
const etal = '(?:et al.?)';
const additional = '(?:,? (?:(?:and |& )?' + authorReg + '|' + etal + '))';
const year_num = '(?:19|20)[0-9][0-9]';
const page_num = '(?:, p.? [0-9]+)?';
const year =
    '(?:, *' + year_num + page_num + '| *(' + year_num + page_num + '))';
export const citeRegex = new RegExp('(' + authorReg + additional + '*' + year + ';?)+', 'g');