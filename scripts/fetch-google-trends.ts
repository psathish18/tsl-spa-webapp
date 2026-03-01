import googleTrends = require('google-trends-api');
import * as fs from 'fs';
import * as path from 'path';

const searchKeyword: string = 'lyrics';
const geo: string = 'IN-TN';

function getStartTime(timeFrame: string): Date {
  switch (timeFrame) {
    case 'hour': {
      const now: Date = new Date();
      now.setHours(now.getHours() - 1);
      return now;
    }
    case '4Hour': {
      const now: Date = new Date();
      now.setHours(now.getHours() - 4);
      return now;
    }
    case '7Days': {
      const now: Date = new Date();
      now.setDate(now.getDate() - 7);
      return now;
    }
    case 'day':
    default: {
      const now: Date = new Date();
      now.setDate(now.getDate() - 1);
      return now;
    }
  }
}

export function fetchTrendData(timeFrame: string = '4Hour'): Promise<void> {
  const startTime: Date = getStartTime(timeFrame);
  const options: any = {
    keyword: searchKeyword,
    startTime: startTime,
    geo: geo,
    granularTimeResolution: true,
  };

  return googleTrends.relatedQueries(options)
    .then((results: string) => {
      const data: any = JSON.parse(results);
      const trendDataTop: any[] = data.default.rankedList[0].rankedKeyword;
      const trendDataRaising: any[] = data.default.rankedList[1].rankedKeyword;

      console.log('=== Top Ranking Keywords ===');
      trendDataTop.forEach((item: any) => {
        console.log('  ' + item.query + ' (value: ' + item.value + ')');
      });
      console.log('=== Rising Keywords ===');
      trendDataRaising.forEach((item: any) => {
        console.log('  ' + item.query + ' (formattedValue: ' + item.formattedValue + ')');
      });

      // Save all unique keywords to a file for the AI filtering step
      const allKeywords: string[] = [
        ...trendDataTop.map((item: any) => item.query as string),
        ...trendDataRaising.map((item: any) => item.query as string),
      ].filter((q, i, arr) => arr.indexOf(q) === i); // deduplicate

      const outputPath = path.join(process.cwd(), 'trends-keywords.txt');
      fs.writeFileSync(outputPath, allKeywords.join('\n'), 'utf8');
      console.log(`\nSaved ${allKeywords.length} keywords to trends-keywords.txt`);
    })
    .catch((err: any) => {
      console.error('Error fetching trends:', err);
    });
}

fetchTrendData('4Hour');