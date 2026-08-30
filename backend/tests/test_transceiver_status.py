from transceiver_status import parse_transceiver_output
from hardware_status import parse_hardware_sensors


def test_parse_transceiver_output():
    result = parse_transceiver_output("eth2", """Transceiver type: SFP+\nVendor name: Acme\nPart number: OPT-10G\nSerial number: ABC123\nModule temperature: 31.2 C\nTX optical power: -2.1 dBm\nAlarm flags: None\nWarning flags: Rx power low\n""")

    assert result.present is True
    assert result.transceiver == "SFP+"
    assert result.vendor == "Acme"
    assert result.measurements["temperature"].value == "31.2 C"
    assert result.measurements["tx_power"].value == "-2.1 dBm"
    assert result.warnings == ["Rx power low"]
    assert result.alarms == []


def test_parse_absent_transceiver():
    result = parse_transceiver_output("eth3", "Transceiver: not present")

    assert result.present is False


def test_parse_transceiver_ignores_inactive_flags_and_thresholds():
    result = parse_transceiver_output("eth2", """Identifier: SFP+
Vendor PN: OPT-10G
Vendor SN: ABC123
Module temperature: 31.2 C
Module temperature high alarm threshold: 90 C
Laser output power: -2.1 dBm
Laser bias current high alarm: Off
Alarm flags: None
Warning flags: Rx power low
Alarm/warning flags implemented: Yes
""")

    assert result.transceiver == "SFP+"
    assert result.part_number == "OPT-10G"
    assert result.serial_number == "ABC123"
    assert result.measurements["temperature"].value == "31.2 C"
    assert result.measurements["tx_power"].value == "-2.1 dBm"
    assert result.warnings == ["Rx power low"]
    assert result.alarms == []


def test_parse_hardware_sensors_ignores_threshold_values_for_status():
    result = parse_hardware_sensors("Package id 0: +40°C (high = +80°C, crit = +100°C)")

    assert result.sensors[0].status == "ok"