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
    result = parse_hardware_sensors("k10temp-pci-00c3\ntemp1:        +40°C  (high = +80°C, crit = +100°C)")

    assert result.sensors[0].status == "ok"


def test_parse_hardware_sensors_handles_hypervisor():
    result = parse_hardware_sensors("VyOS running under hypervisor, no sensors available")
    
    assert result.sensors == []
    assert "no sensors available" in result.raw.lower()


def test_parse_hardware_sensors_handles_no_sensors():
    result = parse_hardware_sensors("No sensors found")
    
    assert result.sensors == []
    assert "no sensors found" in result.raw.lower()


def test_parse_hardware_sensors_summary_is_global_health_sentence():
    result = parse_hardware_sensors("""k10temp-pci-00c3
temp1:        +54.6°C  (high = +70.0°C)
                       (crit = +105.0°C, hyst = +104.0°C)

fam15h_power-pci-00c4
power1:        3.28 W  (interval =   0.01 s, crit =   6.00 W)""")

    assert result.summary == "No issues"


def test_parse_hardware_sensors_full_format():
    result = parse_hardware_sensors("""k10temp-pci-00c3
temp1:        +54.6°C  (high = +70.0°C)
                       (crit = +105.0°C, hyst = +104.0°C)

fam15h_power-pci-00c4
power1:        3.28 W  (interval =   0.01 s, crit =   6.00 W)""")
    
    assert len(result.sensors) == 2
    assert result.sensors[0].name == "k10temp-pci-00c3: temp1"
    assert result.sensors[0].value == "+54.6°C"
    assert result.sensors[0].status == "ok"
    assert result.sensors[0].high == "+70.0"
    assert result.sensors[0].critical == "+105.0"
    
    assert result.sensors[1].name == "fam15h_power-pci-00c4: power1"
    assert result.sensors[1].value == "3.28 W"
    assert result.sensors[1].status == "ok"
    assert result.sensors[1].critical == "6.00"