// function fac(n: number){
//   if (n < 2) return 1;
//   return n * fac(n - 1);
// }

// function tailFac(n: number) {
//   return tailFac_(1, n)
// }

// /** @tco */
// function tailFac_(acc: number, n: number): number {
//   if(n < 2) return acc;
//   else return tailFac_(acc * n, n - 1);
// }

// function tailFac2(n: number) {
//   return tailFac2_(1, n)
// }

// // initialize the parameters...
// // add a do/while
// // replace all instances of the parameters with their mutable friends
// // replace any function call with a series of mutations of their parameters

// function tailFac2_(acc: number, n: number): number {
//   let acc_ = acc;
//   let n_ = n;
//   do {
//     if(n_ < 2) {
//       return acc_;
//     } else {
//       acc_ = acc_ * n_;
//       n_ = n_ - 1;
//     }
//   } while(true)
// }

// console.log('tailFac:  ', fac(10))
// console.log('tailFac2: ', tailFac(10))
// console.log('tailFac3: ', tailFac2(10))
