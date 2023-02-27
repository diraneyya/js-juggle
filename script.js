const cube = number => number ** 3;
const square = number => number ** 2;

{
    const square = number => number ** number;

    console.log(square(4) + cube(8));
}
console.log(square(4) + cube(8));