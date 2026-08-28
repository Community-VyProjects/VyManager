from transceiver_status import parse_transceiver_output


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