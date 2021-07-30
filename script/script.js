/* This script creates a quicksort visualization using canvas.

How it works:
This script captures the animation data (value swaps and highlighting of compared values) from 
our quicksort algorithm and uses that data to create the visualization animation.

In our quicksort algorithm, for every swap or comparison, we will create an 'animation' object 
that will store the information of the values being swapped/compared (plus the pivot value if 
needed), so that we will be able to use this data to animate the action later.

At the end of our quicksort algorithm, we will have an array of animation objects that will 
comprise the entirety of our sorting visualization animation.


Modifiable properties:

BAR_WIDTH   = The width of our bars (pixels)
NUM_ITEMS   = Number of values to be sorted
HEIGHT_MULT = Height multiplier of our bars, this will be value * HEIGHT_MULT (pixels)
SWAP_VAL    = Affects the speed of the bar swaps. This is the distance between the two bars
              divided by SWAP_VALE (pixels per increment)
BAR_SPACING = The spacing between each bar (pixels)

*/

// Notes #A
// Animation as states of the array, with swap/comapare highlight

/* Notes #B
- Group all initilization code in one group
*/

// NOTES #C
// 1. Organize booleans
// 2. Make quotes consistent

// Our canvas
const canvas = document.querySelector('#my-canvas');
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const context = canvas.getContext('2d');

// The offscreen canvas
const offscreenCanvas = document.createElement('canvas');
const offCanvasWidth = offscreenCanvas.width = canvasWidth;
const offCanvasHeight = offscreenCanvas.height = canvasHeight;
const offCanvasContext = offscreenCanvas.getContext('2d');

// Other elements
const newArrayButton = document.querySelector('#new-array');
const startButton = document.querySelector('#sort-array');
const animateCheckBox = document.querySelector('#animate-or-no');
const rangeInput = document.querySelector('#animation-speed')

// Constants for determining animation type
const SORT_SWAP = "sort-swap";
const PIVOT_SWAP = "pivot-swap";
const HIGHLIGHT = "highlight";

// Highlight counter limit (for determining how lond a highlight animation lasts)
const HIGHLIGHT_LIMIT = 0;

// Bar attributes
const BAR_WIDTH = 15;
const NUM_ITEMS = 50;
const HEIGHT_MULT = 8;

let SWAP_VAL = rangeInput.value;      // Swap speed (distance divided by this number)

const FIXED_SPEED =1;   // Fixed speed
const BAR_SPACING = 4;
const WAIT_LIMIT = 1;  // > 0

const barBottomPlacement = canvasHeight - 25

// (Note reset of values)

// Globals
let initializedOff = false;
let initEndValues = false;
let animateFinished = true;
let playing = false;
let highlightStart = false;
let barSpeed;
let animateBars = true;
let animationID;

// (Fix colors)

let listArray = [];
let barList;
let item;
let originalBarPos1, originalBarPos2;
let highlightTimer;
let waitTimer = 0;
let sortingStarted = false;

// Add event listenerd
newArrayButton.addEventListener('click', createNewArray);
startButton.addEventListener('click', startSort);

animateCheckBox.addEventListener('change', function() {
  if (this.checked) {
    console.log('checked');
    animateBars = true;
  } else {
    animateBars = false;
  }
});

class AnimateObject
{
  constructor (animateType)
  {
    this.animateType = animateType;
  }

  getAnimateType ()
  { return this.animateType; }  
}

// Holds the data for a pivot animation (pivot swapping with the hi value)
class AnimatePivot extends AnimateObject
{
  constructor (animateType, value1, pivot, startIndex, endIndex)
  {
    super(animateType);
    this.value1 = value1;
    this.pivot = pivot;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  getStartIndex ()
  { return this.startIndex; }

  getEndIndex ()
  { return this.endIndex; }

  getPivot ()
  { return this.pivot; }

  getValue1 ()
  { return this.value1; }

}

// Holds the data for a highlight or value swap
class AnimateCompare extends AnimatePivot
{
  constructor (animateType, value1, value2, pivot, startIndex, endIndex)
  {
    super(animateType, value1, pivot, startIndex, endIndex);
    
    this.value2 = value2;
  }

  getValue2 ()
  { return this.value2; }

}

// Bar class to hold the bar graphics data
class BarItem
{
  constructor (value, originX, height, color)
  {
    this.value = value
    this.originX = originX;
    this.height = height;
    this.color = color;
  }

  getOriginX ()
  { return this.originX; }

  getHeight ()
  { return this.height; }

  getColor ()
  { return this.color; }

  getValue ()
  { return this.value; }

  setOriginX (originX)
  { this.originX = originX; }

  setColor (color)
  { this.color = color; }

}

// The class that contains an array to hold BarITem objects
class BarList
{
  constructor ()
  {
    this.barList = [];
  }

  getArray ()
  { return this.barList; }

  getItemByValue (value)
  {
    let found = false;
    let counter = -1;

    while (!found)
    {
      counter++;

      if (value == this.barList[counter].getValue())
      { found = true; }
    }

    return this.barList[counter];
  }

  addItem (item)
  {
    this.barList.push(item);
  }

  getIndex (value)
  {
    let counter = -1;
    let found = false;

    while (!found || (counter > this.barList.length - 1))
    {
      counter++;

      if (this.barList[counter].getValue() == value)
      { found = true; }
    }

    return counter;
    
  }

  swap (index1, index2)
  {
    let temp = this.barList[index1];
    this.barList[index1] = this.barList[index2];
    this.barList[index2] = temp;
  }  
  
}
// Return a number bewteen min and max (exclusive)
function randInt (min, max)
{
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

// Quicksort
function quickSort (array)
{
  listArray = [];
  quickSortHelper (array, 0, array.length - 1);
}

// Quicksort helper function (recursion)
function quickSortHelper (array, lo, hi)
{
  let p = lo + randInt(0, hi - lo);

  // console.log(p)
  if (hi > lo)
  {
    p = partition(array, lo, hi, p);
    quickSortHelper(array, lo, p - 1);
    quickSortHelper(array, p + 1, hi);
  }
}

// Partition function
function partition (array, lo, hi, r)
{
  /**
   * leftIndex:  index starting from the left
   * rightIndex: index starting from the right
   * pivotValue: value of pivot index
   */
  let leftIndex, rightIndex, pivotValue;

  // Push animation object into the array first to get the original indexed values
  listArray.push(new AnimatePivot(PIVOT_SWAP, array[hi], array[r], lo, hi))

  swap(array, r, hi);

  rightIndex = hi - 1;
  leftIndex = lo;
  pivotValue = array[hi];

  listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex], pivotValue, lo, hi));

  while (leftIndex <= rightIndex)
  {
    if (array[leftIndex] <= pivotValue)
    {
      leftIndex++;
      listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex], pivotValue, lo, hi));
    } else
    {
      listArray.push(new AnimateCompare(SORT_SWAP, array[leftIndex], array[rightIndex], pivotValue, lo, hi));
      swap(array, leftIndex, rightIndex);
      rightIndex--;

      if (rightIndex > 0)
      {
        listArray.push(new AnimateCompare(HIGHLIGHT, array[leftIndex], array[rightIndex], pivotValue, lo, hi));

      }
    }
  }

  listArray.push(new AnimatePivot(PIVOT_SWAP, array[rightIndex + 1], array[hi], lo, hi));

  swap(array, hi, rightIndex + 1);

  return (rightIndex + 1);
}

// Swap elements in an array
function swap (array, a, b)
{
  let temp = array[a];

  array[a] = array[b];
  array[b] = temp;
}

// Create a bar list from an array of values
function createBarList (array, width)
{
  let startX = Math.floor((canvasWidth - (array.length * (width + BAR_SPACING))) / 2);
  let ourBarList = new BarList();

  for (let i = 0; i < array.length; i++)
  {
    ourBarList.addItem(new BarItem(array[i], startX + (i * (width + BAR_SPACING)), array[i] * HEIGHT_MULT, "rgb(255, 0, 255)"));
  }

  return ourBarList;
}

// Animation method, called my requestAnimationFrame()
function animateItem ()
{

  let elementValue1, elementValue2, pivotValue, barObject1, barObject2;
  animateFinished = false;
  let barArray = barList.getArray();

  /** Animation setup for a Pivot Swap */  
  if (item.getAnimateType() === PIVOT_SWAP)
  {

    // 'elementValue1' represent the pivot
    elementValue1 = item.getPivot();
    elementValue2 = item.getValue1();
    pivotValue = elementValue1;

    // Get the appropriate bar objects from the list
    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);
    pivotObject = barObject1;

    // Set colors for the bars
    barObject1.setColor("rgb(255, 0, 0)");
    barObject2.setColor("rgb(0, 0, 255)");

  /** Animation setup for SORT-SWAP */ 
  } else if ((item.getAnimateType() === SORT_SWAP) || (item.getAnimateType() === HIGHLIGHT))
  {

    elementValue1 = item.getValue1();
    elementValue2 = item.getValue2();
    pivotValue = item.getPivot();

    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);
    pivotObject = barList.getItemByValue(pivotValue);    

    // Set colors for the bars
    barObject1.setColor("rgb(0, 0, 255)");
    barObject2.setColor("rgb(0, 0, 255)");
    pivotObject.setColor("rgb(255, 0, 0)");

  }

  // INITIALIZE OFFSCREEN CANVAS
  // Draw static background to offscreen canvas if not already initialized
  if (initializedOff === false)
  {
    offCanvasContext.clearRect(0, 0, offCanvasWidth, offCanvasHeight);

    for (const barItem of barArray)
    {
      // Draw all the bars, except for the two compared values and the pivot
      if (!((elementValue1 == barItem.getValue()) || (elementValue2 == barItem.getValue()) ||
            (pivotValue == barItem.getValue())))
      {

        barItem.setColor('rgb(228, 128, 228)');
        offCanvasContext.fillStyle = barItem.getColor();
        offCanvasContext.fillRect(barItem.getOriginX(), barBottomPlacement - barItem.getHeight(),
                                  BAR_WIDTH, barItem.getHeight());
      }
    }

    // Draw the bars within the range (in a darker color), except for the two compared values and the pivot
    for (let i = item.getStartIndex(); i <= item.getEndIndex(); i++)
    {
      let barItem = barArray[i];

      if (!((elementValue1 == barItem.getValue()) || (elementValue2 == barItem.getValue()) ||
            (pivotValue == barItem.getValue())))
      {
        barItem.setColor('rgb(228, 0, 228)');
        offCanvasContext.fillStyle = barItem.getColor();
        offCanvasContext.fillRect(barItem.getOriginX(), barBottomPlacement - barItem.getHeight(),
                                  BAR_WIDTH, barItem.getHeight());
      }
    }

    // If this is a sort swap or highlight case, then draw in the pivot bar
    if ((item.getAnimateType() === SORT_SWAP) || (item.getAnimateType() === HIGHLIGHT))
    {
      offCanvasContext.fillStyle = pivotObject.getColor();
      offCanvasContext.fillRect(pivotObject.getOriginX(), barBottomPlacement - pivotObject.getHeight(),
                                BAR_WIDTH, pivotObject.getHeight());
    }

    // Swap values in the array
    if (item.getAnimateType() == PIVOT_SWAP)
    {
      let index1 = barList.getIndex(pivotValue);
      let index2 = barList.getIndex(elementValue2);
      barList.swap(index1, index2);
    } else if (item.getAnimateType() == SORT_SWAP)
    {
      let index1 = barList.getIndex(elementValue1);
      let index2 = barList.getIndex(elementValue2);
      barList.swap(index1, index2);
    }

    // Set initialization of offscreen canvas to true (this will reset once this animation step is done)
    initializedOff = true;
  }

  // Set highlight counter to 0
  if (highlightStart === false)
  {
    highlightTimer = 0;
    highlightStart = true;
  }

  // Initialize the end values for the bars (for which they need to travel to)
  if (initEndValues === false)
  {
    // Get starting positions of our two bars
    originalBarPos1 = barObject1.getOriginX();
    originalBarPos2 = barObject2.getOriginX();
    
    // Determine bar movement speed
    barSpeed = Math.abs(originalBarPos1 - originalBarPos2) / SWAP_VAL;

    // Reset end value initialization boolean
    initEndValues = true;
  }

  // Move the bars
  if (item.getAnimateType() != HIGHLIGHT)
  {
    // console.log(Date.now());
    // Update position of the two bars

    // CASE 1: Bar 1's position is more then Bar 2's
    if (originalBarPos1 > originalBarPos2)
    {

      if (barObject1.getOriginX() > originalBarPos2)
      { barObject1.setOriginX(barObject1.getOriginX() - barSpeed); }

      if (barObject2.getOriginX() <  originalBarPos1)
      { barObject2.setOriginX(barObject2.getOriginX() + barSpeed); }

      // Determine if the bars have reached their final destination
      if ((barObject1.getOriginX() <= originalBarPos2) &&
          (barObject2.getOriginX() >= originalBarPos1))
      {
        // Assure the bars have the precise coordinates after animation is finished
        barObject1.setOriginX(originalBarPos2);
        barObject2.setOriginX(originalBarPos1);

        waitTimer++;

        if (waitTimer == waitTimer)
        {
          animateFinished = true;
        }
      }

    } else

    // CASE 2: Bar 2's position is more then Bar 1's
    {
      if (barObject1.getOriginX() < originalBarPos2)
      { barObject1.setOriginX(barObject1.getOriginX() + barSpeed); }

      if (barObject2.getOriginX() > originalBarPos1)
      { barObject2.setOriginX(barObject2.getOriginX() - barSpeed); }

      // Determine if the bars have reached their final destination
      if ((barObject1.getOriginX() >= originalBarPos2) &&
          (barObject2.getOriginX() <= originalBarPos1))
      {
        // Assure the bars have the precise coordinates after animation is finished        
        barObject1.setOriginX(originalBarPos2);
        barObject2.setOriginX(originalBarPos1);

        waitTimer++;

        if (waitTimer == WAIT_LIMIT)
        { 
          animateFinished = true;
        }

      }
    }

  } else
  {

    highlightTimer++;

    if (highlightTimer > HIGHLIGHT_LIMIT)
    {
      animateFinished = true;
    }
  }

  // Copy the offscreen canvas to the canvas
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(offscreenCanvas, 0, 0);

  // Draw the two moving bars
  context.fillStyle = barObject1.getColor();
  context.fillRect(barObject1.getOriginX(), barBottomPlacement - barObject1.getHeight(),
                              BAR_WIDTH, barObject1.getHeight());
  context.fillStyle = barObject2.getColor();
  context.fillRect(barObject2.getOriginX(), barBottomPlacement - barObject2.getHeight(),
                              BAR_WIDTH, barObject2.getHeight());  
 
  return animateFinished;
}

function startAnimation ()
{
  if(item == undefined)
  {
    if (listArray.length > 0)
    {
      item = listArray.shift();
    } else
    {
      playing = false;
      return;
    }
  }

  // If current animation step is finished
  if (animateItem())
  {

    // console.log("item at start", item);

    if (listArray.length > 0)
    {
      item = listArray.shift();

      // Reset booleans
      initializedOff = false;
      initEndValues = false;
      highlightStart = false;
      waitTimer = 0;
    } else
    {
      playing = false;
      item = undefined;

      // End of animation, redraw with all same colors
      generateBars();
    }
  }

  // Animation not done, more frames
  if(playing)
  {
    animationID = requestAnimationFrame(startAnimation);
  }
}

function createNewArray()
{
  // Cancel current animation if it exists
  if (animationID != null)
  {
    cancelAnimationFrame(animationID);
  }

  ourArray = getRandomArray(NUM_ITEMS);

  // console.log(ourArray);

  barList = createBarList(ourArray, BAR_WIDTH);
  listArray = [];
  item = undefined;
  quickSort(ourArray);

  // console.log(ourArray);
  sortingStarted = false;

  // Reset booleans and values
  playing = false;
  initializedOff = false;
  initEndValues = false;
  animateFinished = false;
  highlightStart = false;  
  waitTimer = 0;

  generateBars();

  // Enable animation inputs
  animateCheckBox.removeAttribute('disabled');
  rangeInput.disabled = false;

}

function getRandomArray (numItems)
{
  numbers = [];
  ourArray = [];

  // Shuffle values from 1 to NUM_ITEMS in an array
  for (let i = 1; i < numItems + 1; i ++)
  {
    numbers.push(i);
  }

  for (let i = 0; i < numItems; i++)
  {
    randomIndex = randInt(0, numbers.length);
    ourArray.push(numbers[randomIndex]);
    numbers.splice(randomIndex, 1);
  }

  return ourArray;
}

function generateBars ()
{
  // console.log("generate bars");
  barArray = barList.getArray();

  context.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const barItem of barArray)
  {

    // console.log(barItem);

    barItem.setColor('rgb(228, 0, 228)');
    context.fillStyle = barItem.getColor();
    context.fillRect(barItem.getOriginX(), barBottomPlacement - barItem.getHeight(),
                              BAR_WIDTH, barItem.getHeight());
  }
}

function startSort ()
{
  if (!sortingStarted)
  {
    playing = true;
    sortingStarted = true;
    animateCheckBox.setAttribute('disabled','disabled');

    if (animateBars == true)
    {
      // console.log(rangeInput.value);
      SWAP_VAL = 31 - rangeInput.value;
    } else {
      SWAP_VAL = 1;
    }

    rangeInput.disabled = true;
    requestAnimationFrame(startAnimation);
  }
}

// Main method
function main ()
{
  ourArray = getRandomArray(NUM_ITEMS);
  // console.log(ourArray);
  
  barList = createBarList(ourArray, BAR_WIDTH);
 
  quickSort(ourArray);

  generateBars();

  // Set playing boolean to false
  playing = false;
  
}

main()