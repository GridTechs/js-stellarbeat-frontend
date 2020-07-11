<template>
    <div class="card this-card">
        <div class="card-header">
            <h4 class="card-title">Latest node updates</h4>
        </div>
        <div class="card-body py-0 overflow-auto">
            <b-list-group flush class="w-100 mb-4">
                <b-list-group-item v-for="updatesOnDate in updatesPerDate" :key="updatesOnDate.date"
                                   class="px-0 pb-0">
                    <div class="d-flex justify-content-between flex-wrap">
                        <div>
                            <div class="text-muted mb-1" style="font-size: small">{{new
                                Date(updatesOnDate.date).toLocaleString()}}
                            </div>
                            <div class="mb-2">
                                <div v-for="update in updatesOnDate.updates" :key="update.key">
                                    <div v-if="update.key === 'ip'">
                                        IP changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'port'">
                                        Port changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'quorumSet'">
                                        Quorumset updated
                                    </div>
                                    <div v-else-if="update.key === 'ledgerVersion'">
                                        Ledger updated to version {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'overlayVersion'">
                                        Overlay updated to version {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'overlayMinVersion'">
                                        Minimum required overlay version is now {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'name'">
                                        Name changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'host'">
                                        Host changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'homeDomain'">
                                        Home domain changed to <a :href="update.value">{{update.value}}</a>
                                    </div>
                                    <div v-else-if="update.key === 'historyUrl'">
                                        History url changed to <a :href="update.value">{{update.value}}</a>
                                    </div>
                                    <div v-else-if="update.key === 'alias'">
                                        Alias changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'isp'">
                                        ISP changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'versionStr'">
                                        Stellar core updated to version {{update.value.replace('stellar-core ',
                                        '').replace('v',
                                        '').replace(/ \(.*$/, '').replace(/\-.*$/, '')}}
                                    </div>
                                    <div v-else-if="update.key === 'countryName'">
                                        Geo location: country changed to {{update.value}}
                                    </div>
                                    <div v-else-if="update.key === 'organizationId'">
                                        Organization changed to {{network.getOrganizationById(update.value) ?
                                        network.getOrganizationById(update.value).name : 'N/A'}}
                                    </div>
                                    <div v-else-if="update.key === 'archival'">
                                        Node {{update.value}}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center mb-2">
                            <b-button size="sm" variant="primary" class="mr-2"
                                      v-on:click="showDiff(updatesOnDate.snapshot)">View diff
                            </b-button>
                        </div>
                    </div>
                </b-list-group-item>
                <b-list-group-item v-if="updatesPerDate.length === 0">
                    No recent updates...
                </b-list-group-item>
            </b-list-group>
        </div>
        <b-modal ref="modal-diff" title="Diff" size="lg">
            <div v-html="diffModalHtml"></div>
        </b-modal>
    </div>
</template>
<script lang="ts">
    import {Component, Prop} from 'vue-property-decorator';
    import Vue from 'vue';
    import {Network, Node, QuorumSet} from '@stellarbeat/js-stellar-domain';
    import Store from '@/store/Store';
    import AsyncComputed from 'vue-async-computed-decorator';
    import {Delta, formatters, create, DiffPatcher} from 'jsondiffpatch';
    import 'jsondiffpatch/dist/formatters-styles/html.css';


    import {
        VBTooltip,
        BTable,
        BModal,
        VBModal,
        BButton,
        BBadge,
        BListGroup,
        BListGroupItem
    } from 'bootstrap-vue';

    interface Update {
        key: string;
        value: any;
    }

    @Component({
        components: {BTable, BModal, BButton, BListGroup, BListGroupItem, BBadge},
        directives: {'b-tooltip': VBTooltip, 'b-modal': VBModal}
    })
    export default class NodeLatestUpdates extends Vue {
        protected differ!: DiffPatcher;
        protected diffModalHtml: string = '<p>No update selected</p>';
        protected deltas: Map<string, Delta | undefined> = new Map();
        protected updatesPerDate: { date: string, updates: Update[], snapshot: any }[] = [];

        @Prop()
        protected node!: Node;

        showDiff(snapShot: any) {
            formatters.html.showUnchanged(false);
            this.diffModalHtml = formatters.html.format(this.deltas.get(snapShot.startDate)!, snapShot);
            (this.$refs['modal-diff'] as BModal).show();
        }

        get store(): Store {
            return this.$root.$data.store;
        }

        @AsyncComputed()
        async snapshots() {
            let snapshots: any = [];
            try {

                this.deltas = new Map();
                this.updatesPerDate = [];
                snapshots = await this.store.fetchNodeSnapshots(this.node.publicKey!);
                snapshots.filter((snapshot: any) => !snapshot.quorumSet)
                    .forEach((snapshot: any) => snapshot.quorumSet = new QuorumSet('empty', 0));
                snapshots.forEach((snapshot: any) => snapshot.quorumSet.innerQuorumSets.sort((a:QuorumSet, b:QuorumSet) => a.hashKey!.localeCompare(b.hashKey!)));

                for (let i = snapshots.length - 2; i >= 0; i--) {
                    let updates: Update[] = [];
                    Object
                        .keys(snapshots[i])
                        .filter(key => !['startDate', 'endDate', 'countryCode'].includes(key))
                        .filter(key => key !== 'quorumSet' ? snapshots[i][key] !== snapshots[i + 1][key] : snapshots[i].quorumSet.hashKey !== snapshots[i + 1].quorumSet.hashKey)
                        .forEach(changedKey => updates.push({key: changedKey, value: snapshots[i][changedKey]}));

                    if (updates.length === 0){
                        updates.push({key: 'archival', value: 'archived'})
                    }

                    this.updatesPerDate.push({date: snapshots[i].startDate, updates: updates, snapshot: snapshots[i]});
                    this.deltas.set(snapshots[i].startDate, this.differ.diff(snapshots[i + 1], snapshots[i]));
                }
                this.updatesPerDate.reverse();

            } catch (e) {
                console.log(e);
            }

            return snapshots;
        }

        mounted() {
            this.differ = create({
                propertyFilter: function (name: string, context: any) {
                    return !['startDate', 'endDate'].includes(name);
                },
            });
        }

        get network(): Network {
            return this.store.network;
        }
    };
</script>

<style scoped>
    .changed {
        background: #5eba00;
    }
    .this-card {
        max-height: 910px;
    }
</style>