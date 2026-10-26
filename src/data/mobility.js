// ===== MOBILITY PROGRAMS =====
export const MOBILITY = {
  hip: {
    name: 'Hüfte',
    icon: '🦵',
    description: 'Ideal nach Beintag oder bei viel Sitzen',
    exercises: [
      { name: '90/90 Hip Switch', duration: '8 pro Seite', steps: ['Beide Beine im 90°-Winkel auf den Boden, eines vor dir, eines seitlich', 'Hüfte rollen, Beine zur anderen Seite drehen', 'Oberkörper aufrecht halten, Bewegung kommt aus der Hüfte', 'Langsam und kontrolliert'] },
      { name: "World's Greatest Stretch", duration: '5 pro Seite', steps: ['Aus dem Ausfallschritt: vorderes Bein 90°, hinteres Knie am Boden', 'Gleichseitige Hand neben den Fuß', 'Anderen Arm zur Decke drehen, Brustwirbelsäule rotieren', '5 Sekunden halten, Seite wechseln'] },
      { name: 'Frog Pose', duration: '60 Sek halten', steps: ['Im Vierfüßlerstand Knie weit auseinander', 'Füße zeigen nach außen, Innenseite der Schienbeine am Boden', 'Hüfte langsam nach hinten schieben', 'Tief atmen, Adduktoren entspannen lassen'] },
      { name: 'Pigeon Pose', duration: '60 Sek pro Seite', steps: ['Vorderes Bein angewinkelt vor dem Körper, hinteres Bein lang ausgestreckt', 'Hüften gerade halten (nicht zur Seite kippen)', 'Oberkörper langsam nach vorne sinken lassen', 'In Po und Hüfte spüren – nicht in den Knien'] },
      { name: 'Couch Stretch (Hüftbeuger)', duration: '60 Sek pro Seite', steps: ['Hinteres Knie am Boden, Fuß an die Wand oder Couch', 'Vorderes Bein im 90°-Winkel', 'Becken nach vorne kippen, Po anspannen', 'Aufrechter Oberkörper – Dehnung in der vorderen Hüfte'] },
    ],
  },
  shoulder: {
    name: 'Schulter',
    icon: '💪',
    description: 'Nach Push-Tag oder bei verspannten Schultern',
    exercises: [
      { name: 'Wall Slides', duration: '10 Wdh', steps: ['Mit dem Rücken zur Wand, Arme im 90°-Winkel an die Wand', 'Hände, Ellbogen, Schultern und Po berühren die Wand', 'Arme langsam nach oben gleiten', 'Kontakt zur Wand halten – nicht abheben'] },
      { name: 'Außenrotation (mit Band)', duration: '12 pro Seite', steps: ['Ellbogen am Körper anliegend, 90°-Winkel', 'Band oder Handtuch in beiden Händen', 'Unterarm langsam nach außen drehen', 'Schulterblatt unten halten, nicht hochziehen'] },
      { name: 'Cross-Body Stretch', duration: '30 Sek pro Seite', steps: ['Arm gestreckt vor dem Körper', 'Mit der anderen Hand am Ellbogen näher zur Brust ziehen', 'Schulter unten halten – nicht hochziehen', 'Spürbar im hinteren Schulterbereich'] },
      { name: 'Doorway Pec Stretch', duration: '30 Sek pro Seite', steps: ['Unterarm im Türrahmen, Ellbogen schulterhoch', 'Schritt durch den Türrahmen', 'Brust geht nach vorne, Arm bleibt fest', 'Dehnung in der Brustmuskulatur'] },
      { name: 'Sleeper Stretch', duration: '30 Sek pro Seite', steps: ['Auf der Seite liegen, unterer Arm im 90°-Winkel nach vorne', 'Mit der oberen Hand den unteren Arm sanft Richtung Boden drücken', 'Rotation in der Schulterkapsel', 'Nicht in den Schmerz – nur leichte Dehnung'] },
    ],
  },
  back: {
    name: 'Rücken',
    icon: '🔙',
    description: 'Nach Pull-Tag oder bei langem Sitzen',
    exercises: [
      { name: 'Cat-Cow', duration: '10 Wdh', steps: ['Vierfüßlerstand, Hände unter Schultern, Knie unter Hüfte', 'Einatmen: Rücken ins Hohlkreuz, Blick nach oben', 'Ausatmen: Rücken rund machen, Kinn zur Brust', 'Langsam und kontrolliert'] },
      { name: 'Thread the Needle', duration: '8 pro Seite', steps: ['Vierfüßlerstand', 'Einen Arm unter dem Körper durchführen', 'Schulter und Wange am Boden, anderer Arm bleibt gestreckt', 'Rotation in der Brustwirbelsäule'] },
      { name: "Child's Pose with Side Reach", duration: '30 Sek pro Seite', steps: ['Knie auseinander, Po auf den Fersen, Stirn am Boden', 'Beide Arme nach vorne strecken', 'Hände nach rechts wandern – linke Flanke dehnt sich', 'Seite wechseln'] },
      { name: 'Lat Stretch (am Rack)', duration: '30 Sek pro Seite', steps: ['An einem Türrahmen oder Rack festhalten', 'Po nach hinten schieben, Arm gestreckt', 'Hüfte zur gegenüberliegenden Seite verlagern', 'Dehnung im Lat (seitlicher Rücken)'] },
      { name: 'Spinal Twist (liegend)', duration: '45 Sek pro Seite', steps: ['Auf dem Rücken liegen, Arme T-förmig ausgestreckt', 'Ein Bein anwinkeln und zur gegenüberliegenden Seite fallen lassen', 'Schultern bleiben am Boden', 'Tief atmen, Rotation lösen lassen'] },
    ],
  },
  tspine: {
    name: 'Brustwirbelsäule',
    icon: '⬆️',
    description: 'Für aufrechte Haltung, vor Push-Tagen ideal',
    exercises: [
      { name: 'Foam Roll T-Spine', duration: '8-10 Wdh', steps: ['Foam Roller quer unter die obere Brustwirbelsäule', 'Hände hinter den Kopf, Ellbogen zusammen', 'Brustwirbelsäule über den Roller nach hinten dehnen', 'Roller leicht verschieben, mehrere Stellen bearbeiten'] },
      { name: 'Open Books', duration: '8 pro Seite', steps: ['Auf der Seite liegen, Knie 90° angewinkelt', 'Beide Arme nach vorne gestreckt', 'Oberen Arm im großen Bogen zur anderen Seite öffnen', 'Knie bleiben zusammen am Boden'] },
      { name: 'Quadruped T-Spine Rotation', duration: '8 pro Seite', steps: ['Vierfüßlerstand', 'Eine Hand zum Hinterkopf', 'Ellbogen zur Decke drehen, Brustwirbelsäule rotieren', 'Blick folgt dem Ellbogen'] },
      { name: 'Wall Angels', duration: '10 Wdh', steps: ['Mit dem Rücken zur Wand, Füße 30 cm entfernt', 'Schulterblätter, Po und Hinterkopf an der Wand', 'Arme im 90°-Winkel an der Wand', 'Langsam nach oben und unten gleiten'] },
      { name: 'Bench T-Spine Extension', duration: '10 Wdh', steps: ['Knien vor einer Bank', 'Ellbogen schulterbreit auf der Bank ablegen', 'Hände hinter dem Kopf zusammen', 'Brust sinkt zwischen die Schultern – T-Spine streckt sich'] },
    ],
  },
  fullbody: {
    name: 'Ganzkörper',
    icon: '🌿',
    description: 'Allround-Mobility für Cardio-Tage',
    exercises: [
      { name: 'Cat-Cow', duration: '10 Wdh', steps: ['Vierfüßlerstand', 'Einatmen: Rücken durchhängen lassen, Blick nach oben', 'Ausatmen: Rücken rund, Kinn zur Brust', 'Atmung mit Bewegung verbinden'] },
      { name: "World's Greatest Stretch", duration: '5 pro Seite', steps: ['Ausfallschritt, vorderes Bein 90°', 'Gleichseitige Hand neben den Fuß', 'Anderen Arm zur Decke rotieren', 'Tiefe Hüftöffnung + Brustwirbelsäulen-Rotation'] },
      { name: 'Down Dog to Up Dog', duration: '8 Wdh', steps: ['Vom Liegestütz: Hüfte zur Decke schieben (Down Dog)', 'Einatmen, durchschwingen zur Up Dog (Hüfte am Boden)', 'Brust öffnen, Schultern weg von den Ohren', 'Fließend zwischen beiden Positionen wechseln'] },
      { name: 'Cossack Squat', duration: '8 pro Seite', steps: ['Sehr breiter Stand, Füße zeigen leicht nach außen', 'Gewicht auf eine Seite, ein Bein beugen, anderes strecken', 'Po geht tief, gestrecktes Bein bleibt gerade', 'Auf andere Seite verlagern'] },
      { name: '90/90 Hip Switch', duration: '8 pro Seite', steps: ['Beide Beine im 90°-Winkel am Boden', 'Hüfte rollen, Beine zur anderen Seite', 'Oberkörper aufrecht', 'Kontrolliert von Seite zu Seite'] },
      { name: 'Standing Forward Fold', duration: '60 Sek halten', steps: ['Stehend, Knie locker', 'Oberkörper Richtung Beine sinken lassen', 'Hände greifen Ellbogen oder Knöchel', 'Locker hängen lassen, Nacken entspannt'] },
    ],
  },
  neck: {
    name: 'Nacken',
    icon: '👤',
    description: 'Bei Schreibtisch-Verspannungen',
    exercises: [
      { name: 'Chin Tucks', duration: '10 Wdh', steps: ['Aufrecht sitzen oder stehen', 'Kinn leicht nach hinten ziehen (Doppelkinn machen)', 'Kopf bleibt waagerecht – nicht nach unten kippen', '2 Sekunden halten, lösen'] },
      { name: 'Neck Rotations', duration: '5 pro Seite', steps: ['Aufrechter Sitz', 'Kopf langsam nach rechts drehen, kurz halten', 'Zurück zur Mitte, dann nach links', 'Schultern bleiben entspannt'] },
      { name: 'Upper Trap Stretch', duration: '30 Sek pro Seite', steps: ['Ohr zur Schulter neigen', 'Andere Hand greift unter dem Po (oder hinter dem Rücken)', 'Sanfter Zug am Kopf mit der freien Hand', 'Gegenseitige Schulter unten halten'] },
      { name: 'Levator Scapulae Stretch', duration: '30 Sek pro Seite', steps: ['Kinn zur Achsel drehen (45°-Winkel)', 'Hand auf den Hinterkopf, sanfter Zug nach vorn-unten', 'Andere Hand hält die Schulter unten', 'Spürbar im seitlichen Nacken/Schulterblatt'] },
      { name: 'Scapula Squeezes', duration: '15 Wdh', steps: ['Aufrechter Sitz, Arme entspannt', 'Schulterblätter zusammenziehen wie eine Bleistift-Klemme', '3 Sekunden halten, lösen', 'Nicht hochziehen – nur zusammenziehen'] },
    ],
  },
};
