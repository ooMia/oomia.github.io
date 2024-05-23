export default function TopButton() {
  return <a href="#">
    <span className="sr-only">맨 위로</span>
    <svg className="w-8 h-8 mx-auto hover:opacity-70" fill="yellow" stroke="currentColor"
         viewBox="0 0 24 24"
         xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z"></path>
    </svg>
  </a>;
}
