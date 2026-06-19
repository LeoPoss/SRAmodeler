export const demoBpmnFiles = {
	"sensor-data-collection": `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xmlns:modeler="http://camunda.org/schema/modeler/1.0" id="Definitions_0k2e32c" targetNamespace="http://bpmn.io/schema/bpmn" exporter="Camunda Modeler" exporterVersion="5.47.0" modeler:executionPlatform="Camunda Cloud" modeler:executionPlatformVersion="8.9.0">
  <bpmn:collaboration id="Collaboration_1c5i8m2">
    <bpmn:participant id="Participant_1p1bohj" name="Sensor Pipeline" processRef="Process_1pqhouy" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1pqhouy" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Sensor Trigger">
      <bpmn:outgoing>Flow_1fabn0q</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Activity_04b7udd" name="Collect Data">
      <bpmn:incoming>Flow_1fabn0q</bpmn:incoming>
      <bpmn:outgoing>Flow_125k0yo</bpmn:outgoing>
    </bpmn:task>
    <bpmn:task id="Activity_02era39" name="Transmit Securely">
      <bpmn:incoming>Flow_125k0yo</bpmn:incoming>
      <bpmn:outgoing>Flow_11ml0fa</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="Event_1r6x841" name="Completed">
      <bpmn:incoming>Flow_064bbyf</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:intermediateThrowEvent id="Event_1aa5d5p" name="Data Received">
      <bpmn:incoming>Flow_11ml0fa</bpmn:incoming>
      <bpmn:outgoing>Flow_064bbyf</bpmn:outgoing>
      <bpmn:messageEventDefinition id="MessageEventDefinition_0ayw1br" />
    </bpmn:intermediateThrowEvent>
    <bpmn:sequenceFlow id="Flow_1fabn0q" sourceRef="StartEvent_1" targetRef="Activity_04b7udd" />
    <bpmn:sequenceFlow id="Flow_125k0yo" sourceRef="Activity_04b7udd" targetRef="Activity_02era39" />
    <bpmn:sequenceFlow id="Flow_11ml0fa" sourceRef="Activity_02era39" targetRef="Event_1aa5d5p" />
    <bpmn:sequenceFlow id="Flow_064bbyf" sourceRef="Event_1aa5d5p" targetRef="Event_1r6x841" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Collaboration_1c5i8m2">
      <bpmndi:BPMNShape id="Participant_1p1bohj_di" bpmnElement="Participant_1p1bohj" isHorizontal="true">
        <dc:Bounds x="160" y="55" width="718" height="250" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="232" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="214" y="205" width="73" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_04b7udd_di" bpmnElement="Activity_04b7udd">
        <dc:Bounds x="320" y="140" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_02era39_di" bpmnElement="Activity_02era39">
        <dc:Bounds x="480" y="140" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1r6x841_di" bpmnElement="Event_1r6x841">
        <dc:Bounds x="742" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="733" y="205" width="54" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1ybocgo_di" bpmnElement="Event_1aa5d5p">
        <dc:Bounds x="642" y="162" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="624" y="205" width="73" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1fabn0q_di" bpmnElement="Flow_1fabn0q">
        <di:waypoint x="268" y="180" />
        <di:waypoint x="320" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_125k0yo_di" bpmnElement="Flow_125k0yo">
        <di:waypoint x="420" y="180" />
        <di:waypoint x="480" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_11ml0fa_di" bpmnElement="Flow_11ml0fa">
        <di:waypoint x="580" y="180" />
        <di:waypoint x="642" y="180" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_064bbyf_di" bpmnElement="Flow_064bbyf">
        <di:waypoint x="678" y="180" />
        <di:waypoint x="742" y="180" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`,
};
