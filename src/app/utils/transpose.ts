export const transpose = (array: any[][]): any[][] => {
  const newArray: any[][] = Array.from({ length: array[0].length }, () => []);

  for (let i = 0; i < array.length; i++) {
    for (let j = 0; j < array[i].length; j++) {
      newArray[j].push(array[i][j]);
    }
  }

  return newArray;
}