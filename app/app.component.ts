import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { MouseEvent } from '@agm/core';
import { select, Selection, selectAll } from 'd3-selection';
import * as d3 from 'd3';

import { hierarchy, tree } from 'd3-hierarchy';
import 'd3-transition';
import dataText from './response';
import { Options } from '@angular-slider/ngx-slider';
import child from './child';
import allData from './allData';

const getId = (node) => {
  return node.data.name;
};

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  // google maps zoom level
  @ViewChild('svg', { static: false }) svgRef: ElementRef;
  @ViewChild('dataBoxRef', { static: true }) dataBoxRef: ElementRef;
  zoom: number = 10;
  value: number = 5;
  options: Options = {
    showTicksValues: true,
    stepsArray: [{ value: 0 }, { value: 20 }, { value: 50 }, { value: 100 }],
  };

  // initial center position for the map
  lat: number = 43.663817543534265;
  lng: number = -79.4810415865476;
  googleMapType = 'satellite';
  search;
  columnsToDisplay = ['record_id', 'type_name', 'name', 'address'];
  data = [];
  showChart = false;

  svg: Selection<any, unknown, null, undefined>;
  globalG: any;
  svgConfig: any = {
    svgWidth: 500,
    svgHeight: 500,
    margin: { top: 20, right: 80, bottom: 30, left: 80 },
    width: 1000 - 60,
    height: 250,
  };
  marginSum = 160;

  constructor() {}

  ngOnInit() {
    console.log('data', this.data);
    this.setupChart(this.data);
  }
  clickedMarker(label: string, index: number) {
    console.log(`clicked the marker: ${label || index}`);
  }

  mapClicked($event: MouseEvent) {
    this.markers.push({
      lat: $event.coords.lat,
      lng: $event.coords.lng,
      draggable: true,
    });
  }

  markerDragEnd(m: marker, $event: MouseEvent) {
    console.log('dragEnd', m, $event);
  }

  markers: marker[] = [];

  searchText() {
    dataText.results.forEach((type) => {
      if (type.type_name == 'person') {
        let obj = {};
        let first = type['attributes']['legal_name']['given_name'] + ' ';
        let last = type['attributes']['legal_name']['last_name'];
        let middle = type['attributes']['legal_name']['middle_name']
          ? type['attributes']['legal_name']['middle_name'] + ' '
          : '';

        obj['record_id'] = type.id;
        obj['type_name'] = type.type_name;
        obj['name'] = first + middle + last;
        obj['address'] =
          type['attributes']['primary_residence']['address_line1'];
        this.data.push(obj);
      }
    });
  }

  sendDetails(d) {
    let addresses = [];
    dataText.results.forEach((data) => {
      if (data.id == d.record_id) {
        let obj = {};
        obj['lat'] = data['attributes']['been_to_address']['latitude_degrees'];
        obj['lng'] = data['attributes']['been_to_address']['longitude_degrees'];
        obj['record_id'] = data['id'];

        let obj2 = {};
        obj2['lat'] =
          data['attributes']['primary_residence']['latitude_degrees'];
        obj2['lng'] =
          data['attributes']['primary_residence']['longitude_degrees'];
        obj2['record_id'] = data['id'];

        addresses.push(obj);
        addresses.push(obj2);
      }
    });

    this.markers = addresses;
  }

  showEntity(data) {
    this.showChart = true;
    let chartData = [];
    let chartObj = {};

    const personData = dataText.results.filter((ele) => {
      if (ele.id == data.record_id) {
        return ele;
      }
      return;
    });
    chartObj['record_id'] = personData[0]['id'];
    chartObj['type_name'] = personData[0]['type_name'];

    chartObj['attributes'] = personData[0]['attributes'];
    chartObj['name'] = personData[0]['attributes']['legal_name']['given_name'];
    chartObj['children'] = [];
    console.log('chartObj', chartObj);

    child.records.forEach((c) => {
      allData.records.forEach((dat) => {
        if (c.record_number == dat.id) {
          if (
            (dat['attributes']['been_to_address'] &&
              dat['attributes']['been_to_address']['longitude_degrees'] !=
                personData[0]['attributes']['been_to_address'][
                  'longitude_degrees'
                ] &&
              dat['attributes']['been_to_address']['latitude_degrees'] !=
                personData[0]['attributes']['been_to_address'][
                  'latitude_degrees'
                ]) ||
            (dat['attributes']['business_address'] &&
              dat['attributes']['business_address']['longitude_degrees'] !=
                personData[0]['attributes']['been_to_address'][
                  'longitude_degrees'
                ] &&
              dat['attributes']['business_address']['latitude_degrees'] !=
                personData[0]['attributes']['been_to_address'][
                  'latitude_degrees'
                ])
          ) {
            let obj = {};
            obj = [dat];
            obj['name'] = dat['attributes']['business_name']
              ? dat['attributes']['business_name']['name']
              : dat['attributes']['legal_name']
              ? dat['attributes']['legal_name']['given_name']
              : '';
            chartObj['children'].push(obj);
            console.log('dat', chartObj);
          }
        }
      });
    });

    chartData.push(chartObj);
    if (this.svg) {
      this.setupChart({});
    }
    this.setupChart(chartObj);
  }

  setupChart(nodeData) {
    this.svg = select(this.svgRef.nativeElement)
      .attr('width', this.svgConfig.svgWidth)
      .attr('height', this.svgConfig.svgHeight)
      .attr(
        'viewBox',
        `0 0 ${this.svgConfig.width + this.marginSum} ${
          this.svgConfig.svgHeight
        }`
      );

    const root = hierarchy(nodeData);
    const treeLayout = tree();
    treeLayout.size([this.svgConfig.svgWidth, this.svgConfig.svgHeight]);

    treeLayout(root);

    // Nodes
    const nodes = select('svg g.nodes')
      .selectAll('circle.node')
      .data(root.descendants());

    const nodeEnter = nodes.enter();
    nodeEnter
      .append('circle')
      .classed('node', true)
      .attr('r', 10)
      .attr('fill', 'steelblue')
      .attr('transform', () => `translate(0 ${this.svgConfig.svgHeight / 2})`)
      .on('mouseover', function (e, d) {
        debugger;
        const validNodes = d.descendants();
        const validIds = validNodes.map((dd) => getId(dd));
        selectAll('circle.node').style('fill', function (nn) {
          const nnId = getId(nn);
          return validIds.includes(nnId) ? 'red' : 'steelblue';
        });

        console.log(links);
        links.style('stroke', (link) => {
          const sourceId = getId(link.source);
          const targetId = getId(link.target);
          return d
            .links()
            .find(
              (l) =>
                getId(l.source) === sourceId && getId(l.target) === targetId
            )
            ? 'red'
            : 'steelblue';
        });
      })
      .on('mouseout', function () {
        selectAll('circle.node').style('fill', 'steelblue');
        links.style('stroke', 'steelblue');
      });

    nodeEnter
      .append('text')
      .attr('x', (d) => d.y + 30)
      .attr('y', (d) => d.x - 5)
      .attr('dy', '.35em')

      .attr('text-anchor', () => 'start')
      .text((d) => `${d.data.name}`)
      .style('fill-opacity', 1);

    const nodeUpdate = selectAll('circle.node')
      .transition()
      .duration(750)
      .attr('transform', (d) => `translate(${d.y} ${d.x})`);

    nodeUpdate
      .select('circle')
      .attr('r', 10)
      .style('fill', function (d) {
        return d.endNode ? 'orange' : 'lightsteelblue';
      });

    nodeUpdate.select('text').style('fill-opacity', 1);

    // nodeUpdate

    //   .selectAll('circle.node')
    //   .text((d) => `${d.data.name}`)
    //   .remove();
    console.log('node update', nodeUpdate);

    const nodeExit = nodes
      .text((d) => `${d.data.name}`)
      .exit()
      .transition()
      .duration(750)
      .attr('transform', function (d) {
        return 'translate(' + 0 + ',' + 0 + ')';
      })
      .remove();

    nodeExit.select('circle').attr('r', 1e-6);
    nodeExit.select('text').style('fill-opacity', 1e-6);

    // Links
    // const links = select("svg g.links")
    //   .selectAll("line.link")
    //   .data(root.links())
    //   .enter()
    //   .append("line")
    //   .classed("link", true)
    //   .attr("x1", d => d.source.y + 10)
    //   .attr("y1", d => d.source.x)
    //   .attr("x2", d => d.target.y)
    //   .attr("y2", d => d.target.x)
    //   .attr("stroke-width", "2px")
    //   .attr("stroke", "steelblue");

    console.log(root.links());
    const links = selectAll('path');
    // const links = select("svg g.links")
    //   .selectAll("line.link")
    //   .data(root.links())
    //   .join("path")
    //   .attr(
    //     "d",
    //     d => `
    //     M${d.target.y},${d.target.x}
    //     C${d.source.y + root.dy / 2},${d.target.x}
    //      ${d.source.y + root.dy / 2},${d.source.x}
    //      ${d.source.y},${d.source.x}
    //   `
    //   );
    this.svg
      .append('g')
      .attr('fill', 'none')
      .selectAll('path')
      .data(root.links())
      .join('path')
      .attr('stroke', 'steelblue')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.5)
      .attr(
        'd',
        (d) => `
        M${d.target.y - 3},${d.target.x + 5}
        C${d.source.y + 15},${d.target.x + 5}
         ${d.source.y + 15},${d.source.x + 5}
         ${d.source.y + 15},${d.source.x + 5}
      `
      );
  }
}

// just an interface for type safety.
interface marker {
  lat: number;
  lng: number;
  label?: string;
  draggable: boolean;
}
