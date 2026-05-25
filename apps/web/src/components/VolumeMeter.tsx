type Props = {
  volume: number;
  active: boolean;
};

export function VolumeMeter({ volume, active }: Props) {
  return (
    <div className="volume-meter">
      <span className="volume-meter__label">
        {active ? "Listening" : "Mic off"}
      </span>
      <div className="volume-meter__bar">
        <div
          className="volume-meter__fill"
          style={{ width: `${active ? volume : 0}%` }}
        />
      </div>
    </div>
  );
}
