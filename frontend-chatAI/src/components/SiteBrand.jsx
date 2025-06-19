import myLogo from '../myLogo.png';

function SiteBrand() {
  return (
    <div className="flex  items-center gap-2 py-2">
      <img src={myLogo} alt="Logo" className="w-14 h-auto max-w-full" />
      <h1 className="text-base font-semibold truncate ">Talk To Your KB</h1>
    </div>
  );
}

export default SiteBrand;
