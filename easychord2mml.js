// easyabcjs6 や chordTemplates.js 等に依存しています

const easychord = {};
easychord.chordId = "chord-notation";
easychord.mmlId = "mml";
easychord.chordTemplateId = "#chord-template";

easychord.init = function() {
  setupChord(easychord);
  easychord.mml = document.querySelector("#" + easychord.mmlId);
  setupSelect(easychord);
  setupKeyBind(easychord);

  easyabcjs6.play = easychord.play;
  easyabcjs6.init();

  function setupChord(easychord) {
    easychord.chord = document.querySelector("#" + easychord.chordId);
    easychord.chord.addEventListener("input", easychord.play);

    const params = new URLSearchParams(window.location.search);
    const textParam = params.get('text');
    if (textParam !== null) {
      easychord.chord.value = textParam;
    }
  }

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

  // プリプロセスを挟む
  const preprocessedChord = preprocessChord(chord);

  try {
    mml = window.chord2mml.parse(preprocessedChord);
    easychord.mml.value = mml;
    abc = window.mml2abc.parse(mml);
  } catch (error) {
    console.error(error);
  }

  easyabcjs6.abcNotation.value = abc;
  easyabcjs6.playSub(abc, ABCJS, easyabcjs6.musicScoreId);
}

function preprocessChord(chord) {
  const transforms = [replaceHyphenToDot, replaceMinorRomanNumerals];

  return findParsableChordVariant(chord);

  // コード進行表記の方言を、できる範囲で全て試して、エラーにならないものを返す
  function findParsableChordVariant(chord) {
    const tried = new Set();
    for (const seq of getAllCombinations(transforms)) {
      let candidate = chord;
      for (const fn of seq) {
        candidate = fn(candidate);
      }
      if (tried.has(candidate)) continue;
      tried.add(candidate);
      try {
        window.chord2mml.parse(candidate);
        return candidate;
      } catch (e) {}
    }
    return chord;
  }

  // 方言：ハイフンを中点に置換
  function replaceHyphenToDot(chord) {
    return chord.replace(/-/g, "・");
  }

  // 方言：ローマ数字マイナー表記を統一
  function replaceMinorRomanNumerals(chord) {
    // 注意、後ろは単語境界ではなく、アルファベット以外とした。iii7 を IIIm7 に変換する用と、「is」は変換しない用。
    return chord
      .replace(/\bvii(?![a-zA-Z])/g, "VIIm")
      .replace(/\biii(?![a-zA-Z])/g, "IIIm")
      .replace(/\bvi(?![a-zA-Z])/g, "VIm")
      .replace(/\biv(?![a-zA-Z])/g, "IVm")
      .replace(/\bii(?![a-zA-Z])/g, "IIm")
      .replace(/\bv(?![a-zA-Z])/g, "Vm")
      .replace(/\bi(?![a-zA-Z])/g, "Im");
  }

  // 全ての変換関数の組み合わせ（順列）を生成
  function getAllCombinations(funcs) {
    const results = [];
    const n = funcs.length;
    // 2^n通りの部分集合（順序あり）を生成
    for (let i = 0; i < (1 << n); i++) {
      let seq = [];
      for (let j = 0; j < n; j++) {
        if (i & (1 << j)) seq.push(funcs[j]);
      }
      // 恒等変換（何もしない）は先頭にのみ許可
      if (seq.length === 0) seq = [x => x];
      results.push(seq);
    }
    // 恒等変換以外は順序を考慮して全順列を生成
    const perms = [];
    for (const seq of results) {
      if (seq.length <= 1) {
        perms.push(seq);
      } else {
        perms.push(...permute(seq));
      }
    }
    return perms;
  }

  // 配列の順列生成
  function permute(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = arr.slice(0, i).concat(arr.slice(i + 1));
      for (const p of permute(rest)) {
        result.push([arr[i], ...p]);
      }
    }
    return result;
  }
}

easychord.init();
