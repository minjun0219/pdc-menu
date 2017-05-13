import _ from 'lodash';
import urldecode from 'urldecode';

const KEY_X = 'x';
const KEY_Y = 'y';

const COLUMN_KEY = 'column';

const DATE_REGEXP = /(\d{1,12})\/(\d{1,31})/;
const MEAL_REGEXP = /^(조식|중식|석식)/;
const MEAL_TIME_REGEXP = /(조식|중식|석식)\((\d{1,2}:\d{1,2})~(\d{1,2}:\d{1,2})\)$/;
const CORNER_COLOR = '#9bba58';

const TYPE = {
  COLUMN: 0,
  BOX: 1
};

function nonFix(n) {
  return n * 1000;
}

/**
 * PDF 식단표 파서
 * @class PDFMenuParser
 */
class PDFMenuParser {

  /**
   * Creates an instance of PDFMenuParser.
   * @param {object} page PDF 데이터의 개별 페이지
   */
  constructor(page) {
    if (!page.Fills || !page.Texts) return;

    // 데이터 분류 값을 미리 설정
    this.meals = [];
    this.date = [];
    this.holiday = [];

    const fills = page.Fills;
    const texts = page.Texts;

    // 코너를 생성할때 사용 될 수평선을 따로 캐싱
    this.verticalLines = _.sortBy(fills.filter(o => o.w > o.h && !o.clr), KEY_Y);
    this.horizonLines = _.sortBy(fills.filter(o => o.w < o.h && !o.clr), KEY_X);

    this.texts = this.prettyTexts(texts);

    // 테이블의 데이터를 분리
    this.parseTable();
  }

  /**
   * 페이지의 테이블을 파싱
   * @return {object}
   */
  parseTable() {
    const hlines = this.horizonLines;
    const vlines = this.linesTree(this.verticalLines, KEY_X, KEY_Y);
    const horizon = this.splitText(hlines, this.texts, TYPE.COLUMN);

    // 세로로 자름
    horizon.forEach(o => {
      // 휴무가 있을 경우 패스
      const isHoliday = o[COLUMN_KEY].filter(t => t.text === '휴무').length;

      // 가로로 자름
      if (!isHoliday && o[COLUMN_KEY]) {
        vlines.forEach((lines, idx) => this.parseMenu(lines, idx, o[COLUMN_KEY]));
      }
    });

    // 날짜 데이터를 기준으로 메뉴를 분류
    this.data = this.date.map((d, idx) => {
      const date = this.parseDate(d);

      // 메뉴별로
      const meal = this.meals.map(o => {
        const menu = {
          name: o.name,
          startTime: this.setDateTime(date, o.startTime),
          endTime: this.setDateTime(date, o.endTime),
          corner: []
        };

        // 코너를 날짜별로 분리
        o.corner.forEach(c => {
          menu.corner.push({
            name: c.name,
            menu: c.menu[idx]
          });
        });
        return menu;
      });

      return {
        date,
        meal
      };
    });
  }

  /**
   * 메뉴 파싱
   * @param {array} lines 메뉴가 구성될 테이블을 라인
   * @param {any} idx 끼니별 Index 번호
   * @param {any} meals 조/중/석식 데이터
   * @returns
   */
  parseMenu(lines, idx, meals) {
    const boxTexts = this.splitText(lines, meals, TYPE.BOX);
    if (!boxTexts.length) return;

    // 끼니를 가져옴
    const meal = this.getMeal(idx);

    // 끼니가 등록되어 있지 않을때만 등록
    if (!meal) {
      const { texts } = this.parseBoxTexts(boxTexts);
      const isMeal = texts.findIndex(o => MEAL_REGEXP.test(o)) > -1;

      if (isMeal) { // 끼니 등록
        this.addMeal({
          idx,
          name: texts
        });
      } else { // 이건 날짜!
        boxTexts.forEach(o => this.addDate(o));
      }
    } else if (meal && !meal.corner.length) { // 코너 등록
      const { colors } = this.parseBoxTexts(boxTexts);
      const isCorner = colors.indexOf(CORNER_COLOR) > -1;
      if (isCorner) {
        boxTexts.forEach(o => this.addCorner(idx, o));
      }
    } else { // 메뉴 등록
      boxTexts.forEach(o => this.addMenu(idx, o));
    }
  }

  getMeal(idx) {
    const meal = this.meals.filter(o => o.idx === idx);
    return meal.length && meal[0];
  }

  addMeal(obj) {
    const meal = this.meals.filter(o => o.idx === obj.idx);
    if (!meal.length) {
      const name = _.flatten(obj.name).join('').match(MEAL_TIME_REGEXP);
      this.meals.push({
        ...obj,
        name: name[1],
        startTime: name[2],
        endTime: name[3],
        corner: []
      });
    }
  }

  addCorner(idx, obj) {
    const meal = this.getMeal(idx);
    if (!meal) return;
    const name = obj.texts.map(o => o.text).join(' ');
    meal.corner.push({
      y: obj.y,
      name,
      menu: []
    });
  }

  addDate(obj) {
    if (obj.texts) {
      const text = this.parseText(obj.texts).join().match(DATE_REGEXP);
      if (text[0]) {
        this.date.push(text[0]);
      }
    }
  }

  addMenu(idx, obj) {
    const meal = this.getMeal(idx);
    if (!meal) return;
    const corners = meal.corner.filter(o => o.y === obj.y);
    if (corners.length) {
      corners[0].menu.push(this.parseText(obj.texts));
    }
  }

  linesTree(lines, key, direction) {
    const split = _.get(_.minBy(lines, key), key);
    const splitLines = lines.filter(o => o[key] === split);
    return splitLines.map((obj, idx, arr) => {
      const next = arr[idx + 1];
      const children = next && this.inArea(lines, obj, next, direction);
      if (children) {
        return [].concat(obj, _.unionBy(children, direction), next);
      }
      return null;
    })
      .filter(o => !!o);
  }

  splitText(lines, texts, type = TYPE.BOX) {
    const direction = type === TYPE.COLUMN ? KEY_X : KEY_Y;
    const childrenKey = type === TYPE.COLUMN ? COLUMN_KEY : 'texts';
    const textsArr = _.sortBy(texts, direction);
    return lines.map((obj, idx, arr) => {
      const next = arr[idx + 1];
      const children = next && this.inArea(textsArr, obj, next, direction);
      return {
        type,
        ...obj,
        [childrenKey]: children
      };
    })
      .filter(o => o[childrenKey] && o[childrenKey].length);
  }

  parseBoxTexts(data) {
    const colors = [];
    const texts = data.map(obj => {
      if (obj.texts && obj.texts.length) {
        const color = obj.texts[0].color;
        if (colors.indexOf(color) < 0) {
          colors.push(color);
        }
        return this.parseText(obj.texts);
      }
      return null;
    });
    return { texts, colors };
  }

  getData() {
    return this.data;
  }

  inArea(arr, start, end, direction) {
    return arr.filter(o => {
      const value = nonFix(o[direction]);
      return nonFix(start[direction]) < value && nonFix(end[direction]) > value;
    });
  }

  prettyTexts(arr) {
    return arr.map(obj => ({
      x: obj.sw ? (obj.x + obj.sw) : obj.x,
      y: obj.sw ? (obj.y + obj.sw) : obj.y,
      text: urldecode(_.result(obj, 'R[0].T')),
      color: obj.oc
    }));
  }

  parseText(texts) {
    return texts.reduce((prev, current) => {
      if (/^(\(|&|-)/.test(current.text)) {
        const last = prev[prev.length - 1];
        if (last) {
          last.text = `${last.text}${current.text}`;
          return prev;
        }
      }
      return prev.concat(current);
    }, [])
      .map(o => o.text);
  }

  parseDate(text) {
    const dateMatch = text.match(DATE_REGEXP);
    if (!dateMatch[0]) return null;

    const year = new Date().getFullYear();
    const month = parseInt(dateMatch[1], 10) - 1;
    const day = parseInt(dateMatch[2], 10);

    return new Date(year, month, day);
  }

  /**
   * @param {Date} date 날짜
   */
  setDateTime(date, timeStr) {
    const time = timeStr.split(':');
    const newDate = new Date(date);
    newDate.setHours(time[0]);
    newDate.setMinutes(time[1]);
    return newDate;
  }

}

export default PDFMenuParser;
