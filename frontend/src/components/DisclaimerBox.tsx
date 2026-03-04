interface Props { showRotation?: boolean }
export default function DisclaimerBox({ showRotation }: Props) {
  return (
    <div className="disclaimer">
      <strong>⚠️ Public Courts Notice:</strong> Public courts follow posted rules and are first-come/rotation-based.
      This app coordinates meetups; <strong>it does not reserve courts.</strong>
      {showRotation && <><br/><strong>🔄 Arrive &amp; Rotate:</strong> If courts are full, follow posted rotation rules.</>}
    </div>
  )
}
