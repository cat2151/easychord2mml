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
  setupKeyBind(easychord);

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

  function setupKeyBind(easychord) {
    easychord.chord.addEventListener('keypress', function(e) {
      if (e.keyCode === 13 && e.shiftKey) { // SHIFT+ENTER
        e.preventDefault(); // 改行しない
        easychord.playWithTimeShifter();
      }
    });
    easychord.chord.addEventListener('keydown', function(e) {
      if (e.keyCode === 83 && e.ctrlKey) { // CTRL+S
        e.preventDefault(); // ページ保存ダイアログを開かない
        easychord.play();
      }
    });
  }
}

easychord.play = function() {
  const chord = easychord.chord.value;
  easychord.playSub(chord);
}

easychord.playWithTimeShifter = function() {
  const orgChord = easychord.chord.value;
  const chord = easychord.insertTimeShifter(orgChord, easychord.chord.selectionStart);
  easychord.playSub(chord);
}

easychord.onChangeSelect = function() {
  const options = document.querySelectorAll(easychord.chordTemplateId + " option");
  easychord.chord.value = options[easychord.select.selectedIndex].value;
  easychord.play();
}

easychord.insertTimeShifter = function(chord, pos) {
  pos = calcTimeShiftPos(chord, pos);
  if (!pos) return chord;
  chord = chord.slice(0, pos) + " |/*!!*/ " + chord.slice(pos); // 小節線がないとパースエラー。engine側の課題と想定する。取り急ぎ応急対策で小節線をつけておく。
  return chord;

  function calcTimeShiftPos(chord, pos) {
    if (isNowSpaceOrLF(chord, pos)) {
      return findLastMatchPos(chord, pos - 1, /[ \n]/); // 例、'I IV' を書いた直後は、'V' の次にposがあり、鳴らしたいのは 'IV' である
    }
    return findLastMatchPos(chord, pos, /[ \n]/);

    function isNowSpaceOrLF(chord, pos) {
      return (chord[pos] && /[ \n]/.test(chord[pos])); // chord[i] がfalsyかを見るのは文字列末尾用
    }

    function findLastMatchPos(chord, pos, regex) {
      for (let i = pos; i >= 0; i--) {
        if (chord[i] && regex.test(chord[i])) { // chord[i] がfalsyかを見るのは文字列末尾用
          return i;
        }
      }
      return 0;
    }
  }
}

easychord.playSub = function(chord) {
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

easychord.init();
