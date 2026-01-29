function toCSV(data, columns = null) {
  if (!data || data.length === 0) {
    return '';
  }
  const headers = columns || Object.keys(data[0]);
  const headerRow = headers.join(',');
  const dataRows = data.map((row) =>
      headers
          .map((header) => {
            const value = row[header];
            return escapeCSVField(value);
          })
          .join(',')
  );
  return [headerRow, ...dataRows].join('\n');
}

function escapeCSVField(value) {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value);
  if (
      stringValue.includes(',') ||
      stringValue.includes('"') ||
      stringValue.includes('\n') ||
      stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function parseCSV(csvString, options = {}) {
  const { hasHeader = true, delimiter = ',' } = options;
  const lines = csvString.trim().split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = hasHeader
      ? parseCSVLine(lines[0], delimiter)
      : lines[0].split(delimiter).map((_, i) => `column${i}`);

  const dataLines = hasHeader ? lines.slice(1) : lines;

  return dataLines.map((line) => {
    const values = parseCSVLine(line, delimiter);
    const obj = {};
    headers.forEach((header, index) => {
      obj[header.trim()] = values[index]?.trim() ?? '';
    });
    return obj;
  });
}

function parseCSVLine(line, delimiter = ',') {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

function pointsToCSV(points) {
  const columns = ['providerName', 'pointid', 'lon', 'lat', 'status', 'cap'];
  return toCSV(points, columns);
}

function sessionsToCSV(sessions) {
  const columns = [
    'starttime',
    'endtime',
    'startsoc',
    'endsoc',
    'totalkwh',
    'kwhprice',
    'amount'
  ];
  return toCSV(sessions, columns);
}

function statusHistoryToCSV(history) {
  const columns = ['timeref', 'old_state', 'new_state'];
  return toCSV(history, columns);
}

const CSV_HEADERS = {
  points: 'providerName,pointid,lon,lat,status,cap',
  sessions: 'starttime,endtime,startsoc,endsoc,totalkwh,kwhprice,amount',
  pointstatus: 'timeref,old_state,new_state'
};

function sendCSVResponse(res, csvData, filename = null) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  if (filename) {
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`
    );
  }
  res.send(csvData);
}

function formatMiddleware(req, res, next) {
  const format = (req.query.format || 'json').toLowerCase();
  if (format !== 'json' && format !== 'csv') {
    return res.status(400).json({
      error: `Invalid format: ${format}. Use 'json' or 'csv'`
    });
  }
  req.responseFormat = format;
  next();
}

function sendFormattedResponse(res, req, data, columns) {
  const format = req.responseFormat || req.query.format || 'json';
  if (format === 'csv') {
    const csvData = toCSV(data, columns);
    sendCSVResponse(res, csvData);
  } else {
    res.json(data);
  }
}

module.exports = {
  toCSV,
  escapeCSVField,
  parseCSV,
  parseCSVLine,
  pointsToCSV,
  sessionsToCSV,
  statusHistoryToCSV,
  CSV_HEADERS,
  sendCSVResponse,
  formatMiddleware,
  sendFormattedResponse
};
