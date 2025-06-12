  export function isValidSelectQuery(query :any) {
    // Simple check to ensure the query starts with SELECT
    return query.trim().toLowerCase().startsWith('select');
  }
