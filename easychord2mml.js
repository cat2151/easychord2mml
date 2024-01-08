// easyabcjs6 や chordTemplates.js 等に依存しています

const easychord = {};
easychord.chordId = "chord-notation";
easychord.mmlId = "mml";
easychord.chordTemplateId = "#chord-template";

easychord.init = function() {
  easychord.chord = document.querySelector("#" + easychord.chordId);
  easychord.chord.addEventListener("input", easychord.play);

  easychord.mml = document.querySelector("#" + easychord.mmlId);

  setupSelect(easychord);

  easyabcjs6.play = easychord.play;
  easyabcjs6.init();

  function setupSelect(easychord) {
    easychord.select = document.querySelector(easychord.chordTemplateId);
    easychord.select.addEventListener('change', easychord.onChangeSelect);
    for (t of chordTemplates) {
      addOptionToSelect(t[1], t[0]);
    }

    function addOptionToSelect(value, text) {
      const opt = document.createElement("option");
      opt.value = removeIndent(value);
      opt.text = text;
      easychord.select.add(opt);

      function removeIndent(rawString) {
        const lines = rawString.split('\n');
        const trimmedLines = lines.map(line => line.trim());
        return trimmedLines.join('\n');
      }
    }
  }
}

easychord.play = function() {
  const chord = easychord.chord.value;
  let mml = "";
  let abc = "";

  try {
    mml = window.chord2mml.parse(chord);
    easychord.mml.value = mml;
    abc = window.mml2abc.parse(mml);
  } catch (error) {
    console.error(error);
  }

  easyabcjs6.abcNotation.value = abc;
  easyabcjs6.playSub(abc, ABCJS, easyabcjs6.musicScoreId);
}

easychord.onChangeSelect = function() {
  const options = document.querySelectorAll(easychord.chordTemplateId + " option");
  easychord.chord.value = options[easychord.select.selectedIndex].value;
  easychord.play();
}

easychord.init();
