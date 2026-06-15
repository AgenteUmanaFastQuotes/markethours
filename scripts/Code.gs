function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('DARKNYTE CLUB - Sessions')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getMarkets() {
  return [
    {
      id: 'tokyo',
      name: 'Tokyo',
      exchange: 'JPX / TSE',
      timezone: 'Asia/Tokyo',
      sessions: [
        ['09:00', '11:30'],
        ['12:30', '15:30']
      ],
      source: 'JPX'
    },
    {
      id: 'korea',
      name: 'Coreia',
      exchange: 'KRX',
      timezone: 'Asia/Seoul',
      sessions: [
        ['09:00', '15:30']
      ],
      source: 'KRX'
    },
    {
      id: 'taiwan',
      name: 'Taiwan',
      exchange: 'TWSE',
      timezone: 'Asia/Taipei',
      sessions: [
        ['09:00', '13:30']
      ],
      source: 'TWSE'
    },
    {
      id: 'singapore',
      name: 'Singapura',
      exchange: 'Singapore Exchange',
      timezone: 'Asia/Singapore',
      sessions: [
        ['09:00', '12:00'],
        ['13:00', '17:00']
      ],
      source: 'SGX'
    },
    {
      id: 'shanghai',
      name: 'Xangai',
      exchange: 'Shanghai Stock Exchange',
      timezone: 'Asia/Shanghai',
      sessions: [
        ['09:30', '11:30'],
        ['13:00', '15:00']
      ],
      source: 'SSE'
    },
    {
      id: 'hongkong',
      name: 'Hong Kong',
      exchange: 'HKEX',
      timezone: 'Asia/Hong_Kong',
      sessions: [
        ['09:30', '12:00'],
        ['13:00', '16:00']
      ],
      source: 'HKEX'
    },
    {
      id: 'philippines',
      name: 'Filipinas',
      exchange: 'Philippine Stock Exchange',
      timezone: 'Asia/Manila',
      sessions: [
        ['09:30', '12:00'],
        ['13:00', '15:15']
      ],
      source: 'PSE'
    },
    {
      id: 'india',
      name: 'Índia',
      exchange: 'NSE',
      timezone: 'Asia/Kolkata',
      sessions: [
        ['09:15', '15:30']
      ],
      source: 'NSE'
    },
    {
      id: 'frankfurt',
      name: 'Frankfurt',
      exchange: 'Frankfurt / Xetra',
      timezone: 'Europe/Berlin',
      sessions: [
        ['08:00', '22:00']
      ],
      source: 'XETRA'
    },
    {
      id: 'london',
      name: 'Londres',
      exchange: 'LSE',
      timezone: 'Europe/London',
      sessions: [
        ['08:00', '16:30']
      ],
      source: 'LSE'
    },
    {
      id: 'newyork',
      name: 'Nova York',
      exchange: 'NYSE',
      timezone: 'America/New_York',
      sessions: [
        ['09:30', '16:00']
      ],
      source: 'NYSE'
    }
  ];
}
