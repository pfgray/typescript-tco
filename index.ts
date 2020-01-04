
function tailFac_(acc: number, n: number): number {
  if(n < 2) return acc;
  else return tailFac_(acc * n, n - 1);
}

console.log(tailFac_(1, 10))