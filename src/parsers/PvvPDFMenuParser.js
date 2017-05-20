import _ from 'lodash';
import PDFMenuParser from '../parsers/PDFMenuParser';

// import { printJSON } from '../lib/print';

class PvvPDFMenuParser extends PDFMenuParser {

  addMeal(obj) {
    const meal = this.meals.filter(o => o.idx === obj.idx);
    if (!meal.length) {
      const name = _.flatten(obj.name).join('').match(this.PATTERN.MEAL)[1];

      let startTime = null;
      let endTime = null;
      if (name === '조식') {
        startTime = '07:00';
        endTime = '09:00';
      } else if (name === '중식') {
        startTime = '11:40';
        endTime = '13:20';
      } else if (name === '석식') {
        startTime = '17:40';
        endTime = '18:50';
      }
      this.meals.push({
        ...obj,
        name,
        startTime,
        endTime,
        corner: []
      });
    }
  }

}

PvvPDFMenuParser.PATTERN = {
  DATE: /(\d{1,12})월 (\d{1,31})/,
  MEAL: /^(조식|중식|석식)/,
  CORNER: /^(한식|일품|웰빙|SALAD)/
};

export default PvvPDFMenuParser;
