import {
  html,
  useIDState,
  useRef,
  useEffect,
  useState,
  useReducer,
  createContext,
  useContext,
} from "/framework";

export async function render() {
  let [count, setCount] = useIDState("counterone", 0);
  let [count2, setCount2] = useState(0);
  let old = useRef(0);
  let btn = useRef(null);

  // why this works? First, the old value is rendered, and after render the old value is updated. Because this is a Ref, there will be no new render
  useEffect(() => (old.current = count), count);

  useEffect(() => console.log(btn.current), 0);

  function countup() {
    setCount2((prev) => prev + 1);
  }
  function countdown() {
    setCount2((prev) => prev - 1);
  }

  const [v, dp] = useReducer((state, action) => {
    switch (action.type) {
      case "COUNT_UP":
        return state + 1;
      case "COUNT_DOWN":
        return state - 1;
      default:
        return state;
    }
  }, 0);
  createContext([v, dp], "counter");

  const [value, dispatch] = useContext("counter");

  let arr = ["a", "b", "c"];

  return html`
    <p>
      ${count.toString()}
      (${/* is useeffect and useref working? */ old.current.toString()})
    </p>
    <button
      ref=${
        btn /* there should be a button element in the console, when referencing works */
      }
      onclick=${() => setCount(count + 1)}
    >
      +1
    </button>
    <button onclick=${() => setCount(count - 1)}>-1</button>
    <p>${count2.toString()}</p>
    <button onclick=${countup}>+1</button>
    <button onclick=${countdown}>-1</button>
    <p>${value.toString()}</p>
    <button onclick=${() => dispatch({ type: "COUNT_UP" })}>+1</button>
    <button onclick=${() => dispatch({ type: "COUNT_DOWN" })}>-1</button>
  `;
}
