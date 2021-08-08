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

// NOTES #A
// Animation as states of the array, with swap/comapare highlight

/* NOTES #B
- Group all initilization code in one group
*/

// NOTES #C
// 1. Organize booleans
// 2. Make quotes consistent

// 3. Fix so that user can choose sorting algorithms
// 4. Modify selection in createNewArray() and in main()
// 5. Array generation/randomization, sorting using global variable?
// 6. Single even listener for the sorting types button ?
// 7. Clean up comments and logs
// 8. Sorting buttons
// 9. Sorting buttons - add function to even listener to call start sort function with appropriate arguments

// Our canvas
const canvas = document.querySelector("#my-canvas");
const canvasWidth = canvas.width;
const canvasHeight = canvas.height;
const context = canvas.getContext("2d");

// The offscreen canvas
const offscreenCanvas = document.createElement("canvas");
const offCanvasWidth = (offscreenCanvas.width = canvasWidth);
const offCanvasHeight = (offscreenCanvas.height = canvasHeight);
const offCanvasContext = offscreenCanvas.getContext("2d");

// Other elements
const newArrayButton = document.querySelector("#new-array");
const startQuicksortButton = document.querySelector("#quicksort-array");
const startBubblesortButton = document.querySelector("#bubblesort-array");
const startHeapSortButton = document.querySelector("#heapsort-array");
const animateCheckBox = document.querySelector("#animate-or-no");
const rangeInput = document.querySelector("#animation-speed");
const algorithmText = document.querySelector("#algorithm-text");

// Constants for determining animation type

// QuickSort (pivot used)
const PIVOT_SORT_SWAP = "pivot-sort-swap"; // Represents two-element swapping with a pivot
const PIVOT_SWAP = "pivot-swap"; // Represents pivot swap
const PIVOT_HIGHLIGHT = "pivot-highlight"; // Represents highlight of a comparison with pivot

const TWO_SORT_SWAP = "two-sort-swap";
const TWO_HIGHLIGHT = "two-highlight";

// Highlight counter limit (for determining how lond a highlight animation lasts)
const HIGHLIGHT_LIMIT = 0;

// Bar attributes
const BAR_WIDTH = 14;
const NUM_ITEMS = 50;
const HEIGHT_MULT = 10;

let SWAP_VAL = rangeInput.value; // Swap speed (distance divided by this number)

const FIXED_SPEED = 1; // Fixed speed
const BAR_SPACING = 4;

// Wait some time, as animate checkbox is initially unchecked
const WAIT_LIMIT = 2; // > 0

const barBottomPlacement = canvasHeight - 5; // How high off the bottom should the bars be

// (Note reset of values)

// Globals
let initializedOff = false;
let initEndValues = false;
let animateFinished = true;
let playing = false;
let highlightStart = false;
let barSpeed;
let animateBars;
let animationID;

// (Fix colors)
let listArray = []; // Our list of actions for our animation
let barList; // Our object containing the bar array
let numberArray; // Our array to hold our values
let heapArraySize;
let item;
let originalBarPos1, originalBarPos2;
let highlightTimer;
let waitTimer = 0;
let sortingStarted = false; // true when sorting starts, reset to false when a new array is created

// Add event listenerd
newArrayButton.addEventListener("click", createNewArray);
startQuicksortButton.addEventListener("click", startQuicksort);
startBubblesortButton.addEventListener("click", startBubblesort);
startHeapSortButton.addEventListener("click", startHeapsort);

animateCheckBox.addEventListener("change", function () {
  if (this.checked) {
    // console.log("checked");
    rangeInput.disabled = false;
    animateBars = true;
    WAIT_LIMIT = 1;
  } else {
    rangeInput.disabled = true;
    animateBars = false;
    WAIT_LIMIT = 2;
  }
});

class AnimateObject {
  constructor(animateType) {
    this.animateType = animateType;
  }

  getAnimateType() {
    return this.animateType;
  }
}

class AnimateCompare extends AnimateObject {
  constructor(animateType, value1, value2, startIndex, endIndex) {
    super(animateType);
    this.value1 = value1;
    this.value2 = value2;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  getStartIndex() {
    return this.startIndex;
  }

  getEndIndex() {
    return this.endIndex;
  }

  getValue1() {
    return this.value1;
  }

  getValue2() {
    return this.value2;
  }
}

// Holds the data for a pivot animation (pivot swapping with the hi value)
class AnimatePivot extends AnimateObject {
  constructor(animateType, value1, pivot, startIndex, endIndex) {
    super(animateType);
    this.value1 = value1;
    this.pivot = pivot;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  getStartIndex() {
    return this.startIndex;
  }

  getEndIndex() {
    return this.endIndex;
  }

  getPivot() {
    return this.pivot;
  }

  getValue1() {
    return this.value1;
  }
}

// Holds the data for a highlight or value swap
class AnimatePivotCompare extends AnimatePivot {
  constructor(animateType, value1, value2, pivot, startIndex, endIndex) {
    super(animateType, value1, pivot, startIndex, endIndex);

    this.value2 = value2;
  }

  getValue2() {
    return this.value2;
  }
}

// Bar class to hold the bar graphics data
class BarItem {
  constructor(value, originX, height, color) {
    this.value = value;
    this.originX = originX;
    this.height = height;
    this.color = color;
  }

  getOriginX() {
    return this.originX;
  }

  getHeight() {
    return this.height;
  }

  getColor() {
    return this.color;
  }

  getValue() {
    return this.value;
  }

  setOriginX(originX) {
    this.originX = originX;
  }

  setColor(color) {
    this.color = color;
  }
}

// The class that contains an array to hold BarITem objects
class BarList {
  constructor() {
    this.barArray = [];
  }

  getArray() {
    return this.barArray;
  }

  getItemByValue(value) {
    let found = false;
    let counter = -1;

    while (!found) {
      counter++;

      if (value == this.barArray[counter].getValue()) {
        found = true;
      }
    }

    return this.barArray[counter];
  }

  addItem(item) {
    this.barArray.push(item);
  }

  getIndex(value) {
    let counter = -1;
    let found = false;

    while (!found || counter > this.barArray.length - 1) {
      counter++;

      if (this.barArray[counter].getValue() == value) {
        found = true;
      }
    }

    return counter;
  }

  swap(index1, index2) {
    let temp = this.barArray[index1];
    this.barArray[index1] = this.barArray[index2];
    this.barArray[index2] = temp;
  }
}
// Return a number bewteen min and max (exclusive)
function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
}

function heapSort() {
  let index = numberArray.length - 1;

  // Initialize array size to max length
  heapArraySize = numberArray.length;

  while (index >= 0) {
    siftDown(index);
    index--;
  }

  // console.log("heapify done");
  // console.log(numberArray);

  for (let i = 0; i < numberArray.length; i++) {
    listArray.push(
      new AnimateCompare(
        TWO_SORT_SWAP,
        numberArray[numberArray.length - 1 - i],
        numberArray[0],
        0,
        heapArraySize - 1
      )
    );
    numberArray[numberArray.length - 1 - i] = popValue();
    console.log(numberArray[numberArray.length - 1 - i]);
  }
}

function popValue() {
  let value;

  if (heapArraySize > 0) {
    value = numberArray[0];

    if (heapArraySize > 1) {
      numberArray[0] = numberArray[heapArraySize - 1];
      heapArraySize--;
      siftDown(0);
    } else {
      heapArraySize--;
    }
  }

  return value;
}

function siftDown(index) {
  let complete = false;
  let zIndex = -1;

  while (index < heapArraySize && complete == false) {
    if (leftChildExist(index)) {
      if (rightChildExist(index)) {
        if (numberArray[leftChild(index)] > numberArray[rightChild(index)]) {
          zIndex = leftChild(index);
        } else {
          zIndex = rightChild(index);
        }
        listArray.push(
          new AnimateCompare(
            TWO_HIGHLIGHT,
            numberArray[leftChild(index)],
            numberArray[rightChild(index)],
            0,
            heapArraySize - 1
          )
        );
      } else {
        zIndex = leftChild(index);
      }

      if (numberArray[zIndex] > numberArray[index]) {
        listArray.push(
          new AnimateCompare(
            TWO_SORT_SWAP,
            numberArray[zIndex],
            numberArray[index],
            0,
            heapArraySize - 1
          )
        );

        swap(numberArray, zIndex, index);
        index = zIndex;
      } else {
        complete = true;
      }
    } else {
      complete = true;
    }
  }
}

function leftChildExist(index) {
  if (leftChild(index) > heapArraySize - 1) {
    return false;
  } else {
    return true;
  }
}

function rightChildExist(index) {
  if (rightChild(index) > heapArraySize - 1) {
    return false;
  } else {
    return true;
  }
}

function parent(index) {
  return Math.floor((index - 1) / 2);
}

function leftChild(index) {
  return 2 * index + 1;
}

function rightChild(index) {
  return 2 * index + 2;
}

function bubbleSort() {
  listArray = [];
  bubbleSortHelper();
}

function bubbleSortHelper() {
  let arrayLength = numberArray.length;
  let temp;

  for (let i = 0; i < arrayLength - 1; i++) {
    for (let j = 0; j < arrayLength - 1 - i; j++) {
      listArray.push(
        new AnimateCompare(
          TWO_HIGHLIGHT,
          numberArray[j],
          numberArray[j + 1],
          0,
          arrayLength - 1 - i
        )
      );

      if (numberArray[j] > numberArray[j + 1]) {
        listArray.push(
          new AnimateCompare(
            TWO_SORT_SWAP,
            numberArray[j],
            numberArray[j + 1],
            0,
            arrayLength - 1 - i
          )
        );
        temp = numberArray[j];
        numberArray[j] = numberArray[j + 1];
        numberArray[j + 1] = temp;
      }
    }
  }
}

// Quicksort
function quickSort() {
  listArray = [];
  quickSortHelper(0, numberArray.length - 1);
}

// Quicksort helper function (recursion)
function quickSortHelper(lo, hi) {
  let p = lo + randInt(0, hi - lo);

  if (hi > lo) {
    p = partition(lo, hi, p);
    quickSortHelper(lo, p - 1);
    quickSortHelper(p + 1, hi);
  }
}

// Partition function
function partition(lo, hi, r) {
  /**
   * leftIndex:  index starting from the left
   * rightIndex: index starting from the right
   * pivotValue: value of pivot index
   */
  let leftIndex, rightIndex, pivotValue;

  // Push animation object into the array first to get the original indexed values
  listArray.push(
    new AnimatePivot(PIVOT_SWAP, numberArray[hi], numberArray[r], lo, hi)
  );

  swap(numberArray, r, hi);

  rightIndex = hi - 1;
  leftIndex = lo;
  pivotValue = numberArray[hi];

  listArray.push(
    new AnimatePivotCompare(
      PIVOT_HIGHLIGHT,
      numberArray[leftIndex],
      numberArray[rightIndex],
      pivotValue,
      lo,
      hi
    )
  );

  while (leftIndex <= rightIndex) {
    if (numberArray[leftIndex] <= pivotValue) {
      leftIndex++;
      listArray.push(
        new AnimatePivotCompare(
          PIVOT_HIGHLIGHT,
          numberArray[leftIndex],
          numberArray[rightIndex],
          pivotValue,
          lo,
          hi
        )
      );
    } else {
      listArray.push(
        new AnimatePivotCompare(
          PIVOT_SORT_SWAP,
          numberArray[leftIndex],
          numberArray[rightIndex],
          pivotValue,
          lo,
          hi
        )
      );
      swap(numberArray, leftIndex, rightIndex);
      rightIndex--;

      if (rightIndex > 0) {
        listArray.push(
          new AnimatePivotCompare(
            PIVOT_HIGHLIGHT,
            numberArray[leftIndex],
            numberArray[rightIndex],
            pivotValue,
            lo,
            hi
          )
        );
      }
    }
  }

  listArray.push(
    new AnimatePivot(
      PIVOT_SWAP,
      numberArray[rightIndex + 1],
      numberArray[hi],
      lo,
      hi
    )
  );

  swap(numberArray, hi, rightIndex + 1);

  return rightIndex + 1;
}

// Swap elements in an array
function swap(array, a, b) {
  let temp = array[a];

  array[a] = array[b];
  array[b] = temp;
}

// Create a bar list from an array of values
function createBarList(width) {
  let startX = Math.floor(
    (canvasWidth - numberArray.length * (width + BAR_SPACING)) / 2
  );
  let ourBarList = new BarList();

  for (let i = 0; i < numberArray.length; i++) {
    ourBarList.addItem(
      new BarItem(
        numberArray[i],
        startX + i * (width + BAR_SPACING),
        numberArray[i] * HEIGHT_MULT,
        "rgb(255, 0, 255)"
      )
    );
  }

  return ourBarList;
}

// Animation method, called my requestAnimationFrame()
function animateItem() {
  let elementValue1, elementValue2, pivotValue, barObject1, barObject2;
  animateFinished = false;
  let ourBarArray = barList.getArray();

  /** Animation setup for a Pivot Swap */
  if (item.getAnimateType() === PIVOT_SWAP) {
    // 'elementValue1' represents the pivot
    elementValue1 = item.getPivot();
    elementValue2 = item.getValue1();
    pivotValue = elementValue1;

    // Get the appropriate bar objects from the list
    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);
    pivotObject = barObject1;

    // Set colors for the bars
    barObject1.setColor("rgb(255, 77, 148)");
    barObject2.setColor("rgb(148, 77, 255)");

    /** Animation setup for SORT-SWAP */
  } else if (
    item.getAnimateType() === PIVOT_SORT_SWAP ||
    item.getAnimateType() === PIVOT_HIGHLIGHT
  ) {
    elementValue1 = item.getValue1();
    elementValue2 = item.getValue2();
    pivotValue = item.getPivot();

    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);
    pivotObject = barList.getItemByValue(pivotValue);

    // Set colors for the bars
    barObject1.setColor("rgb(148, 77, 255)");
    barObject2.setColor("rgb(148, 77, 255)");
    pivotObject.setColor("rgb(255, 77, 148)");

    /** Animation setup for a two-element (no pivot) swap */
  } else if (
    item.getAnimateType() === TWO_SORT_SWAP ||
    item.getAnimateType() === TWO_HIGHLIGHT
  ) {
    elementValue1 = item.getValue1();
    elementValue2 = item.getValue2();

    barObject1 = barList.getItemByValue(elementValue1);
    barObject2 = barList.getItemByValue(elementValue2);

    barObject1.setColor("rgb(148, 77, 255)");
    barObject2.setColor("rgb(148, 77, 255)");
  }

  // console.log(barObject1, barObject2);

  // INITIALIZE OFFSCREEN CANVAS
  // Draw static background to offscreen canvas if not already initialized
  if (initializedOff === false) {
    offCanvasContext.clearRect(0, 0, offCanvasWidth, offCanvasHeight);

    for (const barItem of ourBarArray) {
      // Draw all the bars, except for the two compared values and the pivot
      if (
        !(
          elementValue1 == barItem.getValue() ||
          elementValue2 == barItem.getValue() ||
          pivotValue == barItem.getValue()
        )
      ) {
        barItem.setColor("rgb(174, 227, 234)");
        offCanvasContext.fillStyle = barItem.getColor();
        offCanvasContext.fillRect(
          barItem.getOriginX(),
          barBottomPlacement - barItem.getHeight(),
          BAR_WIDTH,
          barItem.getHeight()
        );
      }
    }

    // Draw the bars within the range (in a darker color), except for the two compared values and the pivot
    for (let i = item.getStartIndex(); i <= item.getEndIndex(); i++) {
      let barItem = ourBarArray[i];

      if (
        !(
          elementValue1 == barItem.getValue() ||
          elementValue2 == barItem.getValue() ||
          pivotValue == barItem.getValue()
        )
      ) {
        barItem.setColor("rgb(0, 191, 207)");
        offCanvasContext.fillStyle = barItem.getColor();
        offCanvasContext.fillRect(
          barItem.getOriginX(),
          barBottomPlacement - barItem.getHeight(),
          BAR_WIDTH,
          barItem.getHeight()
        );
      }
    }

    // If this is a sort swap or highlight case, then draw in the pivot bar
    if (
      item.getAnimateType() === PIVOT_SORT_SWAP ||
      item.getAnimateType() === PIVOT_HIGHLIGHT
    ) {
      offCanvasContext.fillStyle = pivotObject.getColor();
      offCanvasContext.fillRect(
        pivotObject.getOriginX(),
        barBottomPlacement - pivotObject.getHeight(),
        BAR_WIDTH,
        pivotObject.getHeight()
      );
    }

    // Swap values in the array
    if (item.getAnimateType() == PIVOT_SWAP) {
      let index1 = barList.getIndex(pivotValue);
      let index2 = barList.getIndex(elementValue2);
      barList.swap(index1, index2);
    } else if (
      item.getAnimateType() == PIVOT_SORT_SWAP ||
      item.getAnimateType() == TWO_SORT_SWAP
    ) {
      let index1 = barList.getIndex(elementValue1);
      let index2 = barList.getIndex(elementValue2);
      barList.swap(index1, index2);
    }

    // Set initialization of offscreen canvas to true (this will reset once this animation step is done)
    initializedOff = true;
  }

  // Set highlight counter to 0
  if (highlightStart === false) {
    highlightTimer = 0;
    highlightStart = true;
  }

  // Initialize the end values for the bars (for which they need to travel to)
  if (initEndValues === false) {
    // Get starting positions of our two bars
    originalBarPos1 = barObject1.getOriginX();
    originalBarPos2 = barObject2.getOriginX();

    // Determine bar movement speed
    barSpeed = Math.abs(originalBarPos1 - originalBarPos2) / SWAP_VAL;

    // Reset end value initialization boolean
    initEndValues = true;
  }

  // Move the bars
  if (
    item.getAnimateType() != PIVOT_HIGHLIGHT &&
    item.getAnimateType() != TWO_HIGHLIGHT
  ) {
    // Update position of the two bars

    // CASE 1: Bar 1's position is more then Bar 2's
    if (originalBarPos1 > originalBarPos2) {
      if (barObject1.getOriginX() > originalBarPos2) {
        barObject1.setOriginX(barObject1.getOriginX() - barSpeed);
      }

      if (barObject2.getOriginX() < originalBarPos1) {
        barObject2.setOriginX(barObject2.getOriginX() + barSpeed);
      }

      // Determine if the bars have reached their final destination
      if (
        barObject1.getOriginX() <= originalBarPos2 &&
        barObject2.getOriginX() >= originalBarPos1
      ) {
        // Assure the bars have the precise coordinates after animation is finished
        barObject1.setOriginX(originalBarPos2);
        barObject2.setOriginX(originalBarPos1);

        waitTimer++;

        if (waitTimer == WAIT_LIMIT) {
          animateFinished = true;
        }
      }
    }

    // CASE 2: Bar 2's position is more then Bar 1's
    else {
      if (barObject1.getOriginX() < originalBarPos2) {
        barObject1.setOriginX(barObject1.getOriginX() + barSpeed);
      }

      if (barObject2.getOriginX() > originalBarPos1) {
        barObject2.setOriginX(barObject2.getOriginX() - barSpeed);
      }

      // Determine if the bars have reached their final destination
      if (
        barObject1.getOriginX() >= originalBarPos2 &&
        barObject2.getOriginX() <= originalBarPos1
      ) {
        // Assure the bars have the precise coordinates after animation is finished
        barObject1.setOriginX(originalBarPos2);
        barObject2.setOriginX(originalBarPos1);

        waitTimer++;

        if (waitTimer == WAIT_LIMIT) {
          animateFinished = true;
        }
      }
    }
  } else {
    highlightTimer++;

    if (highlightTimer > HIGHLIGHT_LIMIT) {
      animateFinished = true;
    }
  }

  // Copy the offscreen canvas to the canvas
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.drawImage(offscreenCanvas, 0, 0);

  // Draw the two moving bars
  context.fillStyle = barObject1.getColor();
  context.fillRect(
    barObject1.getOriginX(),
    barBottomPlacement - barObject1.getHeight(),
    BAR_WIDTH,
    barObject1.getHeight()
  );
  context.fillStyle = barObject2.getColor();
  context.fillRect(
    barObject2.getOriginX(),
    barBottomPlacement - barObject2.getHeight(),
    BAR_WIDTH,
    barObject2.getHeight()
  );

  return animateFinished;
}

function startAnimation() {
  if (item == undefined) {
    if (listArray.length > 0) {
      item = listArray.shift();
    } else {
      playing = false;
      return;
    }
  }

  // If current animation step is finished
  if (animateItem()) {
    if (listArray.length > 0) {
      item = listArray.shift();

      // Reset booleans
      initializedOff = false;
      initEndValues = false;
      highlightStart = false;
      waitTimer = 0;
    } else {
      playing = false;
      item = undefined;

      // End of animation, redraw with all same colors
      generateBars();
    }
  }

  // Animation not done, more frames
  if (playing) {
    animationID = requestAnimationFrame(startAnimation);
  }
}

function createNewArray() {
  // Cancel current animation if it exists
  if (animationID != null) {
    cancelAnimationFrame(animationID);
  }

  enableSortButtons();
  ungreyButtons();
  algorithmText.style.color = "black";
  algorithmText.style.fontWeight = "300";
  algorithmText.textContent = "Algorithms";
  numberArray = getRandomArray(NUM_ITEMS);

  barList = createBarList(BAR_WIDTH);
  listArray = [];
  heapArraySize = numberArray.length;
  item = undefined;

  // bubbleSort(ourArray);
  // quickSort(ourArray);

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
  animateCheckBox.removeAttribute("disabled");
  if (animateCheckBox.checked == true) {
    rangeInput.disabled = false;
  } else {
    rangeInput.disabled = true;
  }
}

function getRandomArray(numItems) {
  numbers = [];
  ourArray = [];

  // Shuffle values from 1 to NUM_ITEMS in an array
  for (let i = 1; i < numItems + 1; i++) {
    numbers.push(i);
  }

  for (let i = 0; i < numItems; i++) {
    randomIndex = randInt(0, numbers.length);
    ourArray.push(numbers[randomIndex]);
    numbers.splice(randomIndex, 1);
  }

  return ourArray;
}

function generateBars() {
  ourBarArray = barList.getArray();

  context.clearRect(0, 0, canvasWidth, canvasHeight);

  for (const barItem of ourBarArray) {
    barItem.setColor("rgb(63, 191, 207)");
    context.fillStyle = barItem.getColor();
    context.fillRect(
      barItem.getOriginX(),
      barBottomPlacement - barItem.getHeight(),
      BAR_WIDTH,
      barItem.getHeight()
    );
  }
}

function startHeapsort() {
  if (!sortingStarted) {
    disableSortButtons();
    greyButtons();
    algorithmText.style.color = "darkgreen";
    algorithmText.style.fontWeight = "bold";
    algorithmText.textContent = "Heapsort";
    heapSort();
    playing = true;
    sortingStarted = true;
    animateCheckBox.setAttribute("disabled", "disabled");

    if (animateBars == true) {
      SWAP_VAL = 31 - rangeInput.value;
    } else {
      SWAP_VAL = 1;
    }

    rangeInput.disabled = true;
    requestAnimationFrame(startAnimation);
  }
}
function startBubblesort() {
  if (!sortingStarted) {
    disableSortButtons();
    greyButtons();
    algorithmText.style.color = "darkgreen";
    algorithmText.style.fontWeight = "bold";
    algorithmText.textContent = "Bubble Sort";
    bubbleSort();
    playing = true;
    sortingStarted = true;
    animateCheckBox.setAttribute("disabled", "disabled");

    if (animateBars == true) {
      SWAP_VAL = 31 - rangeInput.value;
    } else {
      SWAP_VAL = 1;
    }

    rangeInput.disabled = true;
    requestAnimationFrame(startAnimation);
  }
}

function greyButtons() {
  startBubblesortButton.style.background = "rgb(159, 207, 159)";
  startBubblesortButton.style.borderColor = "rgb(191, 239, 191)";
  startHeapSortButton.style.background = "rgb(159, 207, 159)";
  startHeapSortButton.style.borderColor = "rgb(191, 239, 191)";
  startQuicksortButton.style.background = "rgb(159, 207, 159)";
  startQuicksortButton.style.borderColor = "rgb(191, 239, 191)";
}

function ungreyButtons() {
  startBubblesortButton.style.background = "seagreen";
  startBubblesortButton.style.borderColor = "darkgreen";
  startHeapSortButton.style.background = "seagreen";
  startHeapSortButton.style.borderColor = "darkgreen";
  startQuicksortButton.style.background = "seagreen";
  startQuicksortButton.style.borderColor = "darkgreen";
}

function startQuicksort() {
  if (!sortingStarted) {
    disableSortButtons();
    greyButtons();
    algorithmText.style.color = "darkgreen";
    algorithmText.style.fontWeight = "bold";
    algorithmText.textContent = "Quicksort";
    quickSort();
    playing = true;
    sortingStarted = true;
    animateCheckBox.setAttribute("disabled", "disabled");

    if (animateBars == true) {
      SWAP_VAL = 31 - rangeInput.value;
    } else {
      SWAP_VAL = 1;
    }

    rangeInput.disabled = true;
    requestAnimationFrame(startAnimation);
  }
}

function disableSortButtons() {
  startBubblesortButton.disabled = true;
  startHeapSortButton.disabled = true;
  startQuicksortButton.disabled = true;
}

function enableSortButtons() {
  startBubblesortButton.disabled = false;
  startHeapSortButton.disabled = false;
  startQuicksortButton.disabled = false;
}

function initBarAnimation() {
  if (animateCheckBox.checked) {
    // console.log("checked");
    rangeInput.disabled = false;
    animateBars = true;
  } else {
    rangeInput.disabled = true;
    animateBars = false;
  }
}
// Main method
function main() {
  initBarAnimation();
  // Array generation/randomization, sorting using global variable?
  numberArray = getRandomArray(NUM_ITEMS);

  barList = createBarList(BAR_WIDTH);

  // quickSort(ourArray);
  // bubbleSort(ourArray);
  // console.log(ourArray);
  // console.log(listArray);

  generateBars();

  /*
  console.log(numberArray);

  heapSort(numberArray);

  console.log(numberArray);
  */

  // Set playing boolean to false
  playing = false;

  // Testing - bubble sort

  /**
  let ourBubbleArray = getRandomArray(20);
  console.log(ourBubbleArray);
  bubbleSort(ourBubbleArray);
  console.log(ourBubbleArray);
  */
}

main();
