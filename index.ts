
function tailFac_(acc: number, n: number): number {
  if(n < 2) return acc;
  else return tailFac_(acc * n, n - 1);
}
