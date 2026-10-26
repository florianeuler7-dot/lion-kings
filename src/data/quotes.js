// ===== MOTIVATION QUOTES =====
export const MOTIVATION_QUOTES = [
  { text: 'Wer nicht trainiert, hat keine Entschuldigungen – nur Ergebnisse, die fehlen.', author: 'Markus Rühl' },
  { text: 'Ich hab\' nie gezählt, wie viel ich hebe. Ich hab\' gezählt, wie oft ich aufgestanden bin.', author: 'Markus Rühl' },
  { text: 'Das Eisen lügt nie. Menschen lügen, Zahlen lügen – aber das Eisen nicht.', author: 'Markus Rühl' },
  { text: 'Wenn\'s brennt, wird\'s gut.', author: 'Markus Rühl' },
  { text: 'Der Körper hat immer mehr drauf als der Kopf glaubt.', author: 'Markus Rühl' },
  { text: 'Aufhören ist keine Option. Pause ja, aufhören nein.', author: 'Markus Rühl' },
  { text: 'Ich bin nicht hier um gut auszusehen. Ich bin hier um stärker zu werden.', author: 'Markus Rühl' },
  { text: 'Du willst aufhören? Dann mach noch drei.', author: 'Markus Rühl' },
  { text: 'Keine Ausreden. Kein Mitleid. Einfach machen.', author: 'Markus Rühl' },
  { text: 'Wer Muskeln will, muss leiden wollen. Klingt hart, ist aber so.', author: 'Markus Rühl' },
  { text: 'Ein schlechtes Training ist besser als kein Training.', author: 'Markus Rühl' },
  { text: 'Eat, sleep, train, repeat – und irgendwann passt nix mehr.', author: 'Markus Rühl' },
  { text: 'Der einzige schlechte Satz im Training ist der, den du nicht gemacht hast.', author: 'Markus Rühl' },
  { text: 'Shut up and train.', author: 'Markus Rühl' },
  { text: 'Schmerz ist temporär. Stolz ist für immer.', author: 'Markus Rühl' },
  { text: 'Niemand wird groß durch zuschauen. Du musst selbst ran.', author: 'Markus Rühl' },
  { text: 'Im Training gibt\'s kein Morgen. Nur jetzt und dieser Satz.', author: 'Markus Rühl' },
  { text: 'Wer aufhört, besser werden zu wollen, hört auf, gut zu sein.', author: 'Markus Rühl' },
  { text: 'Das Gewicht weiß nicht, ob du müde bist. Also interessiert\'s mich auch nicht.', author: 'Markus Rühl' },
  { text: 'Nicht das Gewicht macht dich groß – die Wiederholungen, die wehtun.', author: 'Markus Rühl' },
  { text: 'The last three or four reps is what makes the muscle grow.', author: 'Arnold Schwarzenegger' },
  { text: 'Of course it\'s heavy. That\'s why they call it weight.', author: 'Arnold Schwarzenegger' },
  { text: 'You can have results or excuses. Not both.', author: 'Arnold Schwarzenegger' },
  { text: 'Champions aren\'t made in gyms. Champions are made from something deep inside.', author: 'Arnold Schwarzenegger' },
  { text: 'The mind always fails first, not the body.', author: 'Arnold Schwarzenegger' },
  { text: 'I don\'t do this to be the best. I do this because it\'s who I am.', author: 'Chris Bumstead' },
  { text: 'Every day you wake up is an opportunity to be better than yesterday.', author: 'Chris Bumstead' },
  { text: 'You\'re not tired. You\'re just weak. And that\'s fixable.', author: 'Chris Bumstead' },
  { text: 'Consistency beats intensity. Show up every day, no matter what.', author: 'Chris Bumstead' },
  { text: 'The only person you\'re competing with is who you were yesterday.', author: 'Chris Bumstead' },
  { text: 'Im Leben gibt es nur zwei Optionen – du machst es, oder du machst es nicht. Einen Mittelweg gibt es nicht.', author: 'Arda Saatçi' },
  { text: 'Du sagst, du willst nicht ins Gym – genau das ist das Zeichen, dass du gehen musst.', author: 'Arda Saatçi' },
  { text: 'Disziplin schlägt Motivation. Immer.', author: 'Arda Saatçi' },
  { text: 'Es reicht nicht, das Ergebnis eines anderen zu wollen – du musst auch seinen Weg wollen.', author: 'Arda Saatçi' },
  { text: 'Jede Investition in dich selbst kommt zurück – als Muskel, als Selbstvertrauen, als Leben.', author: 'Arda Saatçi' },
  { text: 'Der Kessel muss brennen, laufen muss es!', author: null },
];

export const CHEER_MESSAGES = [
  'STARK! 💪', 'BOOM! 🔥', 'GEILE EINHEIT!', 'NO EXCUSES! 🔥',
  'WEITER SO!', 'BEAST MODE!', 'DOER! ⚡', 'SO GEHT DAS!',
  'KILLER SATZ! 🔥', 'MAKER!', 'NICHT AUFHÖREN!', 'WEITER, WEITER!',
];

// Deterministic "quote of the day"
export function quoteOfTheDay(list = MOTIVATION_QUOTES) {
  const d = new Date();
  const dayIndex = d.getFullYear() * 366 + d.getMonth() * 31 + d.getDate();
  return list[dayIndex % list.length];
}
