export default function MedicineCard({ medicine }) {
  const {
    queried_as,
    name,
    category,
    purpose,
    howToTake,
    goodFoods,
    avoidFoods,
    avoidDrinks,
    lifestyleTips,
    whenToSeekHelp,
  } = medicine;

  return (
    <article className="med-card">
      <div className="med-card-head">
        <h3>{name}</h3>
        <span className="category">{category}</span>
      </div>

      <div className="med-card-body">
        <p className="purpose-line">{purpose}</p>

        <div className="how-to-take">
          <strong>How it's usually taken: </strong>
          {howToTake}
        </div>

        <div className="two-col">
          <div>
            <div className="col-title good">🌿 GOOD TO HAVE</div>
            <ul className="plain-list">
              {goodFoods.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="col-title avoid">✕ BETTER TO AVOID</div>
            <ul className="plain-list">
              {[...avoidFoods, ...avoidDrinks].map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="col-title good" style={{ marginBottom: 10 }}>
          ☀ LIFESTYLE TIPS
        </div>
        <div className="tips-strip">
          {lifestyleTips.map((tip, i) => (
            <span className="tip-pill" key={i}>
              {tip}
            </span>
          ))}
        </div>

        <div className="seek-help">
          <strong>Contact your doctor if you notice:</strong>
          {whenToSeekHelp.join(" · ")}
        </div>
      </div>
    </article>
  );
}
